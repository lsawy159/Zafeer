// barrel re-export — zero change for all consumers of this module
// Company re-exported explicitly for `import type { Company }` compatibility
export type { Company } from '../lib/supabase'
export * from './alerts/alertThresholds'
export * from './alerts/companyExpiryChecks'
export * from './alerts/companyAlertGenerators'
export * from './alerts/alertHelpers'
