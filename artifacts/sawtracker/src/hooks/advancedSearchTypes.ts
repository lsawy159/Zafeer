// Shared types for the Advanced Search feature

export interface SavedSearchFilters {
  // Employee filters
  nationality?: string
  company?: string
  profession?: string
  project?: string
  residenceStatus?: string
  contractStatus?: string
  hasHealthInsuranceExpiry?: string | boolean
  healthInsuranceExpiryStatus?: string
  hasPassport?: string | boolean
  hasBankAccount?: string | boolean
  birthDateRange?: string
  joiningDateRange?: string
  passportNumberSearch?: string
  residenceNumberSearch?: string
  // Company filters
  commercialRegStatus?: string
  companyDateFilter?: string
  powerSubscriptionStatus?: string
  moqeemSubscriptionStatus?: string
  employeeCountFilter?: string
  availableSlotsFilter?: string
  exemptionsFilter?: string
  unifiedNumberSearch?: string
  taxNumberSearch?: string
  laborSubscriptionNumberSearch?: string
  maxEmployeesRange?: string
  companyCreatedDateRange?: string
  companyCreatedStartDate?: string
  companyCreatedEndDate?: string
  notesSearch?: string
  notesFilter?: 'all' | 'has_notes' | 'no_notes'
}

export interface SavedSearch {
  id: string
  name: string
  search_query: string
  search_type: string
  filters: SavedSearchFilters
}

export type TabType = 'employees' | 'companies'
export type ResidenceStatus = 'all' | 'expired' | 'expiring_soon' | 'valid'
export type ContractStatus = 'all' | 'expired' | 'expiring_soon' | 'valid'
export type CommercialRegStatus = 'all' | 'expired' | 'expiring_soon' | 'valid'
export type ViewMode = 'grid' | 'table'
