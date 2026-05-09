import { pgEnum } from 'drizzle-orm/pg-core'

export const emailStatusEnum = pgEnum('email_status', [
  'pending', 'processing', 'sent', 'failed', 'completed',
])

export const emailPriorityEnum = pgEnum('email_priority', [
  'low', 'medium', 'high', 'urgent',
])

export const obligationTypeEnum = pgEnum('obligation_type_enum', [
  'transfer', 'renewal', 'penalty', 'advance', 'other',
])

export const obligationPlanStatusEnum = pgEnum('obligation_plan_status_enum', [
  'draft', 'active', 'completed', 'cancelled', 'superseded',
])

export const obligationLineStatusEnum = pgEnum('obligation_line_status_enum', [
  'unpaid', 'partial', 'paid', 'rescheduled', 'cancelled',
])

export const payrollScopeTypeEnum = pgEnum('payroll_scope_type_enum', [
  'company', 'project',
])

export const payrollInputModeEnum = pgEnum('payroll_input_mode_enum', [
  'manual', 'excel', 'mixed',
])

export const payrollRunStatusEnum = pgEnum('payroll_run_status_enum', [
  'draft', 'processing', 'finalized', 'cancelled',
])

export const payrollEntryStatusEnum = pgEnum('payroll_entry_status_enum', [
  'draft', 'calculated', 'finalized', 'paid', 'cancelled',
])

export const payrollComponentTypeEnum = pgEnum('payroll_component_type_enum', [
  'earning', 'deduction', 'installment',
])
