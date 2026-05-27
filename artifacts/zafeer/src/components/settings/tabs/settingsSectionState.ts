export type AdminSettingsCapabilityAvailability = 'available' | 'unavailable' | 'restricted'

export type SettingsSectionStatus = 'idle' | 'loading' | 'ready' | 'degraded' | 'failed'

export type SettingsDiagnosticClass =
  | 'expected_empty'
  | 'expected_restriction'
  | 'actionable_failure'

export interface AdminSettingsCapability {
  key: string
  availability: AdminSettingsCapabilityAvailability
  reason: string
  fallbackMode: string
}

export interface SettingsSectionLoadState {
  sectionKey: string
  status: SettingsSectionStatus
  userMessage?: string
  diagnosticClass?: SettingsDiagnosticClass
}

export function createAdminSettingsCapability(
  key: string,
  availability: AdminSettingsCapabilityAvailability,
  reason: string,
  fallbackMode: string
): AdminSettingsCapability {
  return {
    key,
    availability,
    reason,
    fallbackMode,
  }
}

export function createSectionLoadState(
  sectionKey: string,
  status: SettingsSectionStatus = 'idle',
  extras: Omit<SettingsSectionLoadState, 'sectionKey' | 'status'> = {}
): SettingsSectionLoadState {
  return {
    sectionKey,
    status,
    ...extras,
  }
}
