// مصدر حقيقة واحد لأسماء أعمدة ملف الحضور
// يُستورد من كل من: generator (StepUploadAttendance) و parser (نفس الملف)
export const ATTENDANCE_TEMPLATE_COLUMNS = {
  residenceNumber: 'رقم الإقامة',
  employeeName: 'اسم الموظف',
  attendanceDays: 'أيام الحضور',
} as const

export type AttendanceTemplateColumn = keyof typeof ATTENDANCE_TEMPLATE_COLUMNS

export interface AttendanceRow {
  residenceNumber: number
  employeeName: string
  attendanceDays: number
}

export interface MatchedEmployee {
  employeeId: string
  employeeName: string
  residenceNumber: number
  profession: string
  monthlyRate: number
  attendanceDays: number
  totalDaysInMonth: number
  amount: number
  matchStatus: 'matched' | 'unknown' | 'invalid_days'
}

export function calcAmount(
  monthlyRate: number,
  totalDaysInMonth: number,
  attendanceDays: number
): number {
  if (totalDaysInMonth <= 0) return 0
  return Math.round(((monthlyRate / totalDaysInMonth) * attendanceDays) * 100) / 100
}

export function validateAttendanceDays(days: number, totalDaysInMonth: number): boolean {
  return Number.isInteger(days) && days >= 0 && days <= totalDaysInMonth
}

export function normalizeAttendanceRow(raw: Record<string, unknown>): AttendanceRow | null {
  const residenceRaw = raw[ATTENDANCE_TEMPLATE_COLUMNS.residenceNumber]
  const daysRaw = raw[ATTENDANCE_TEMPLATE_COLUMNS.attendanceDays]
  const nameRaw = raw[ATTENDANCE_TEMPLATE_COLUMNS.employeeName]

  const residenceNumber = Number(residenceRaw)
  const attendanceDays = Number(daysRaw)

  if (!residenceRaw || isNaN(residenceNumber) || residenceNumber <= 0) return null
  if (isNaN(attendanceDays)) return null

  return {
    residenceNumber,
    employeeName: String(nameRaw ?? '').trim(),
    attendanceDays,
  }
}

export interface EmployeeForMatching {
  id: string
  name: string
  residence_number: number
  profession: string | null
}

export interface RateForMatching {
  profession: string
  monthly_rate: number
}

export function matchAttendanceToEmployees(
  rows: AttendanceRow[],
  employees: EmployeeForMatching[],
  rates: RateForMatching[],
  totalDaysInMonth: number
): MatchedEmployee[] {
  const employeeByResidence = new Map<number, EmployeeForMatching>()
  for (const emp of employees) {
    if (emp.residence_number) {
      employeeByResidence.set(emp.residence_number, emp)
    }
  }

  const rateByProfession = new Map<string, number>()
  for (const rate of rates) {
    rateByProfession.set(rate.profession.trim().toLowerCase(), Number(rate.monthly_rate))
  }

  return rows.map((row): MatchedEmployee => {
    const emp = employeeByResidence.get(row.residenceNumber)

    if (!emp) {
      return {
        employeeId: '',
        employeeName: row.employeeName,
        residenceNumber: row.residenceNumber,
        profession: '',
        monthlyRate: 0,
        attendanceDays: row.attendanceDays,
        totalDaysInMonth,
        amount: 0,
        matchStatus: 'unknown',
      }
    }

    const profession = emp.profession?.trim() ?? ''
    const monthlyRate = rateByProfession.get(profession.toLowerCase()) ?? 0
    const isInvalidDays = !validateAttendanceDays(row.attendanceDays, totalDaysInMonth)

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      residenceNumber: row.residenceNumber,
      profession,
      monthlyRate,
      attendanceDays: row.attendanceDays,
      totalDaysInMonth,
      amount: calcAmount(monthlyRate, totalDaysInMonth, row.attendanceDays),
      matchStatus: isInvalidDays ? 'invalid_days' : 'matched',
    }
  })
}
