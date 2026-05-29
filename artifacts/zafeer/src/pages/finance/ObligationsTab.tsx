import PayrollDeductionsContent from './PayrollDeductionsContent'

// default export تبقى بنفس الاسم — compatible مع FinancePage + PayrollDeductions.tsx (legacy)
export default function ObligationsTab() {
  return <PayrollDeductionsContent defaultTab="obligations" hideTabBar />
}
