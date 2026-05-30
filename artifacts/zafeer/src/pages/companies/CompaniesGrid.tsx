import { type CSSProperties } from 'react'
import { Company } from '@/lib/supabase'
import CompanyCard from '@/components/companies/CompanyCard'
import type { CompanyWithCount } from './useCompaniesPage'
import { getAvailableSlotsColor, getAvailableSlotsTextColor, getAvailableSlotsText } from './useCompaniesPage'

interface CompaniesGridProps {
  paginatedCompanies: CompanyWithCount[]
  companyGridClass: string
  onCardClick: (company: CompanyWithCount) => void
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
}

export function CompaniesGrid({
  paginatedCompanies,
  companyGridClass,
  onCardClick,
  onEdit,
  onDelete,
}: CompaniesGridProps) {
  return (
    <div className={companyGridClass}>
      {paginatedCompanies.map((company, index) => (
        <div
          key={company.id}
          onClick={() => onCardClick(company)}
          className="stagger-item group cursor-pointer transition-transform duration-300 hover:-translate-y-0.5"
          style={{ '--i': Math.min(index, 11) } as CSSProperties}
        >
          <CompanyCard
            company={company}
            onEdit={onEdit}
            onDelete={onDelete}
            getAvailableSlotsColor={getAvailableSlotsColor}
            getAvailableSlotsTextColor={getAvailableSlotsTextColor}
            getAvailableSlotsText={getAvailableSlotsText}
          />
        </div>
      ))}
    </div>
  )
}
