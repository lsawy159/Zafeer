import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { useAdhkar, AdhkarItem } from '@/hooks/useAdhkar'
import { useAdhkarSettings } from '@/hooks/useAdhkarSettings'
import { fisherYates } from '@/lib/adhkarUtils'

export interface AdhkarContextValue {
  current: AdhkarItem | null
  isPlaying: boolean
  next(): void
  prev(): void
}

const AdhkarContext = createContext<AdhkarContextValue | undefined>(undefined)

export function AdhkarProvider({ children }: { children: ReactNode }) {
  const { data: adhkar } = useAdhkar()
  const { settings } = useAdhkarSettings()

  // shuffled list lives in a ref so timer callbacks never stale-close over it
  const shuffledRef = useRef<AdhkarItem[]>([])
  const adhkarRef = useRef(adhkar)
  const settingsRef = useRef(settings)

  const [index, setIndex] = useState(0)
  // cycleKey forces effect re-run even when index stays 0 (single-item / re-shuffle)
  const [cycleKey, setCycleKey] = useState(0)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { adhkarRef.current = adhkar }, [adhkar])

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  // re-init shuffle when adhkar list loads or changes
  useEffect(() => {
    clearTimer()
    if (!adhkar || adhkar.length === 0) {
      shuffledRef.current = []
      setIndex(0)
      setCycleKey(k => k + 1)
      return
    }
    shuffledRef.current = fisherYates(adhkar)
    setIndex(0)
    setCycleKey(k => k + 1)
  }, [adhkar, clearTimer])

  const isPlaying = shuffledRef.current.length > 0
  const current = shuffledRef.current[index] ?? null

  // after display_duration_ms advance to next dhikr — no gap between dhikrs
  useEffect(() => {
    clearTimer()
    if (!isPlaying) return

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setIndex(prev => {
        const nextI = prev + 1
        if (nextI >= shuffledRef.current.length) {
          const src = adhkarRef.current
          if (src && src.length > 0) shuffledRef.current = fisherYates(src)
          return 0
        }
        return nextI
      })
      setCycleKey(k => k + 1)
    }, settingsRef.current.display_duration_ms)

    return clearTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, index, cycleKey])

  const next = useCallback(() => {
    clearTimer()
    setIndex(prev => {
      const nextI = prev + 1
      if (nextI >= shuffledRef.current.length) {
        const src = adhkarRef.current
        if (src && src.length > 0) shuffledRef.current = fisherYates(src)
        return 0
      }
      return nextI
    })
    setCycleKey(k => k + 1)
  }, [clearTimer])

  const prev = useCallback(() => {
    clearTimer()
    setIndex(p => {
      if (shuffledRef.current.length <= 1) return 0
      return p <= 0 ? shuffledRef.current.length - 1 : p - 1
    })
    setCycleKey(k => k + 1)
  }, [clearTimer])

  return (
    <AdhkarContext.Provider value={{ current, isPlaying, next, prev }}>
      {children}
    </AdhkarContext.Provider>
  )
}

export function useAdhkarContext() {
  const ctx = useContext(AdhkarContext)
  if (!ctx) throw new Error('useAdhkarContext must be used inside AdhkarProvider')
  return ctx
}
