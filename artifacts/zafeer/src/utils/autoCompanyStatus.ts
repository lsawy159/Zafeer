// barrel re-export — zero change for all consumers
// F-01 fix: calculateDaysRemaining lives in statusHelpers, re-exported from there (not moved)
export { calculateDaysRemaining } from './statusHelpers'
export * from './autoCompanyStatus/statusThresholds'
export * from './autoCompanyStatus/unifiedStatus'
export * from './autoCompanyStatus/commercialRegStatus'
export * from './autoCompanyStatus/powerStatus'
export * from './autoCompanyStatus/moqeemStatus'
