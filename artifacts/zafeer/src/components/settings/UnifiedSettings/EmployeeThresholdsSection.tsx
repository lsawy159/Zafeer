import { AlertTriangle, Palette, Sparkles } from 'lucide-react'
import type { UnifiedSettingsData } from './unifiedSettingsConfig'
import { EMPLOYEE_SECTIONS } from './unifiedSettingsConfig'

interface PreviewEntry {
  key: string
  title: string
  icon: string
  values: { urgentDays: number; highDays: number; mediumDays: number; greenStart: number }
}

interface Props {
  settings: UnifiedSettingsData
  setSettings: (s: UnifiedSettingsData) => void
  employeePreviews: PreviewEntry[]
  isReadOnly: boolean
}

export function EmployeeThresholdsSection({ settings, setSettings, employeePreviews, isReadOnly }: Props) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="app-icon-chip">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              إعدادات ألوان وتنبيهات الموظفين
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              تحكم في الأيام والألوان والتنبيهات لجميع حالات الموظفين. التغييرات تنعكس فوراً على
              الجداول والكروت والتنبيهات.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EMPLOYEE_SECTIONS.map((section) => (
            <div
              key={section.key}
              className="border border-neutral-200 rounded-lg p-3 bg-gradient-to-br from-gray-50 to-white"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-lg">{section.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{section.title}</h3>
                  <p className="text-[11px] text-neutral-600">{section.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-neutral-700">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    أحمر (طارئ)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    برتقالي (عاجل)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    أصفر (متوسط)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settings[section.fields.urgent]}
                    onChange={(e) =>
                      setSettings({ ...settings, [section.fields.urgent]: parseInt(e.target.value) || 0 })
                    }
                    disabled={isReadOnly}
                    className={`w-full px-3 py-2 border border-red-200 rounded-lg text-center text-sm font-bold text-red-700 bg-white focus:ring-2 focus:ring-red-500 ${
                      isReadOnly ? 'opacity-60 cursor-not-allowed bg-neutral-50' : ''
                    }`}
                  />
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settings[section.fields.high]}
                    onChange={(e) =>
                      setSettings({ ...settings, [section.fields.high]: parseInt(e.target.value) || 0 })
                    }
                    disabled={isReadOnly}
                    className={`w-full px-3 py-2 border border-orange-200 rounded-lg text-center text-sm font-bold text-warning-700 bg-white focus:ring-2 focus:ring-orange-500 ${
                      isReadOnly ? 'opacity-60 cursor-not-allowed bg-neutral-50' : ''
                    }`}
                  />
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settings[section.fields.medium]}
                    onChange={(e) =>
                      setSettings({ ...settings, [section.fields.medium]: parseInt(e.target.value) || 0 })
                    }
                    disabled={isReadOnly}
                    className={`w-full px-3 py-2 border border-yellow-200 rounded-lg text-center text-sm font-bold text-yellow-700 bg-white focus:ring-2 focus:ring-yellow-500 ${
                      isReadOnly ? 'opacity-60 cursor-not-allowed bg-neutral-50' : ''
                    }`}
                  />
                </div>

                <div className="text-xs text-neutral-600 space-y-1 bg-white border border-neutral-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>أحمر: منتهي أو ≤ {settings[section.fields.urgent]} يوم</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-warning-600" />
                    <span>برتقالي: ≤ {settings[section.fields.high]} يوم</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                    <span>أصفر: ≤ {settings[section.fields.medium]} يوم</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>أخضر: أكثر من {settings[section.fields.medium]} يوم</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-neutral-900">معاينة سريعة - الموظفين</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {employeePreviews.map((section) => (
            <div key={section.key} className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg">{section.icon}</span>
                <span className="text-[13px] font-semibold text-neutral-900">{section.title}</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-neutral-700">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span>حتى {section.values.urgentDays} يوم</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                  <span>حتى {section.values.highDays} يوم</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <span>حتى {section.values.mediumDays} يوم</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <span>من {section.values.greenStart} يوم</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
