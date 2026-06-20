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

  // shuffled list + current index live in refs so timer callbacks never stale-close over them
  const shuffledRef = useRef<AdhkarItem[]>([])
  const indexRef = useRef(0)
  const adhkarRef = useRef(adhkar)
  const settingsRef = useRef(settings)

  // current and isPlaying are state (not derived from refs during render) — fixes react-hooks/refs
  const [current, setCurrent] = useState<AdhkarItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  // cycleKey forces timer effect re-run even when index stays 0 (single-item / re-shuffle)
  const [cycleKey, setCycleKey] = useState(0)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { adhkarRef.current = adhkar }, [adhkar])

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  // re-init shuffle when adhkar list loads or changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    clearTimer()
    if (!adhkar || adhkar.length === 0) {
      shuffledRef.current = []
      indexRef.current = 0
      setCurrent(null)
      setIsPlaying(false)
      return
    }
    shuffledRef.current = fisherYates(adhkar)
    indexRef.current = 0
    setCurrent(shuffledRef.current[0] ?? null)
    setIsPlaying(true)
    setCycleKey(k => k + 1)
  }, [adhkar, clearTimer])
  /* eslint-enable react-hooks/set-state-in-effect */

  // after display_duration_ms advance to next dhikr — no gap between dhikrs
  useEffect(() => {
    clearTimer()
    if (!isPlaying) return

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      let nextI = indexRef.current + 1
      if (nextI >= shuffledRef.current.length) {
        const src = adhkarRef.current
        if (src && src.length > 0) shuffledRef.current = fisherYates(src)
        nextI = 0
      }
      indexRef.current = nextI
      setCurrent(shuffledRef.current[nextI] ?? null)
      setCycleKey(k => k + 1)
    }, settingsRef.current.display_duration_ms)

    return clearTimer
  }, [isPlaying, cycleKey, clearTimer])

  const next = useCallback(() => {
    clearTimer()
    let nextI = indexRef.current + 1
    if (nextI >= shuffledRef.current.length) {
      const src = adhkarRef.current
      if (src && src.length > 0) shuffledRef.current = fisherYates(src)
      nextI = 0
    }
    indexRef.current = nextI
    setCurrent(shuffledRef.current[nextI] ?? null)
    setCycleKey(k => k + 1)
  }, [clearTimer])

  const prev = useCallback(() => {
    clearTimer()
    const len = shuffledRef.current.length
    if (len <= 1) return
    const prevI = indexRef.current <= 0 ? len - 1 : indexRef.current - 1
    indexRef.current = prevI
    setCurrent(shuffledRef.current[prevI] ?? null)
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
