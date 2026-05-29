import PayrollDeductionsContent from './PayrollDeductionsContent'

// 'search' هو اسم القسم الداخلي المقابل لـ "الاستقطاعات والجزاءات" في FinancePage
export default function DeductionsTab() {
  return <PayrollDeductionsContent defaultTab="search" hideTabBar />
}
