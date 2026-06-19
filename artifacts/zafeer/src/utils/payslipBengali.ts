import type { EmployeeObligationPlan, AllObligationsSummaryRow } from '@/hooks/useEmployeeObligations'
import type { PayrollEntry } from '@/lib/supabase'

interface SlipComponent {
  component_type?: string
  component_code?: string
  amount?: number
  notes?: string | null
}

type KnownComponentCode =
  | 'OVERTIME'
  | 'TRANSFER_RENEWAL'
  | 'PENALTY'
  | 'ADVANCE'
  | 'OTHER'

export const AR_LABELS = {
  title: 'قسيمة راتب',
  slipNumber: 'رقم القسيمة',
  month: 'الشهر',
  date: 'التاريخ',
  issuedAt: 'تاريخ الإصدار',
  employee: 'الموظف',
  residenceNumber: 'رقم الإقامة',
  companyProject: 'المؤسسة / المشروع',
  basicSalary: 'الراتب الأساسي',
  grossSalary: 'اجمالي الراتب',
  totalDeductions: 'اجمالي الخصومات',
  installmentDeduction: 'خصم الاقساط',
  netSalary: 'صافي الراتب',
  attendanceSection: 'تفاصيل الحضور والاستحقاق',
  attendanceDays: 'ايام الحضور',
  paidLeaveDays: 'الاجازات المدفوعة',
  overtime: 'الاضافي',
  penalties: 'الجزاءات / الغرامات',
  dayUnit: 'يوم',
  currency: 'ر.س',
  obligationsSection: 'ملخص الالتزامات المالية',
  totalRemaining: 'اجمالي المتبقي من الالتزامات',
  monthlyInstallment: 'القسط الشهري المقرر',
  componentsSection: 'مكونات القسيمة التفصيلية',
  componentType: 'النوع',
  componentCode: 'الكود',
  amount: 'المبلغ',
  amountWithCurrency: 'المبلغ (ر.س)',
  notes: 'الملاحظات',
  noComponents: 'لا توجد مكونات تفصيلية محفوظة',
  componentValueEarning: 'استحقاق',
  componentValueDeduction: 'استقطاع',
  componentValueInstallment: 'قسط',
  componentValueUnknown: 'عنصر',
  componentCodeOvertime: 'إضافي',
  componentCodeTransferRenewal: 'رسوم نقل وتجديد',
  componentCodePenalty: 'جزاءات وغرامات',
  componentCodeAdvance: 'سلفة',
  componentCodeOther: 'استقطاع آخر',
  componentNoteOvertime: 'إضافة عن شهر',
  componentNoteTransferRenewal: 'استقطاع رسوم نقل وتجديد عن شهر',
  componentNotePenalty: 'استقطاع جزاءات وغرامات عن شهر',
  componentNoteAdvance: 'استقطاع سلفة عن شهر',
  componentNoteOther: 'استقطاع آخر عن شهر',
  scheduleSection: 'جدول الاقساط التفصيلي',
  scheduleDueMonth: 'الشهر',
  scheduleAmountDue: 'المبلغ المستحق',
  schedulePaid: 'المدفوع',
  scheduleRemaining: 'المتبقي',
  scheduleStatus: 'الحالة',
  scheduleTotal: 'الإجمالي',
  scheduleFrom: 'من',
  scheduleCount: 'الأقساط',
  schedulePaidCount: 'عدد الأقساط المدفوعة',
  scheduleRemainingCount: 'عدد الأقساط المتبقية',
  currentMonth: '◄ الحالي',
  noInstallments: 'لا توجد أقساط',
  oblTypeAdvance: 'سلفة',
  oblTypeTransfer: 'نقل كفالة',
  oblTypeRenewal: 'تجديد',
  oblTypePenalty: 'غرامة',
  oblTypeOther: 'التزام آخر',
  statusPaid: 'مدفوع',
  statusPartial: 'مدفوع جزئياً',
  statusUnpaid: 'غير مدفوع',
  statusSkipped: 'متجاوز',
  statusCancelled: 'ملغى',
  statusRescheduled: 'معاد جدولته',
  slipNumberLabel: 'رقم القسيمة',
  issuedAtLabel: 'تاريخ الإصدار',
  companyFallback: 'زفير',
} as const

export const BN_LABELS = {
  title: 'বেতন স্লিপ',
  slipNumber: 'স্লিপ নম্বর',
  month: 'মাস',
  date: 'তারিখ',
  issuedAt: 'ইস্যুর তারিখ',
  employee: 'কর্মচারী',
  residenceNumber: 'ইকামা নম্বর',
  companyProject: 'প্রতিষ্ঠান / প্রকল্প',
  basicSalary: 'মূল বেতন',
  grossSalary: 'মোট বেতন',
  totalDeductions: 'মোট কর্তন',
  installmentDeduction: 'কিস্তি কর্তন',
  netSalary: 'নিট বেতন',
  attendanceSection: 'উপস্থিতি ও প্রাপ্যতার বিবরণ',
  attendanceDays: 'উপস্থিত দিন',
  paidLeaveDays: 'বেতনসহ ছুটি',
  overtime: 'ওভারটাইম',
  penalties: 'জরিমানা / শাস্তি',
  dayUnit: 'দিন',
  currency: 'SAR',
  obligationsSection: 'আর্থিক দায়বদ্ধতার সারসংক্ষেপ',
  totalRemaining: 'দায়বদ্ধতার মোট বকেয়া',
  monthlyInstallment: 'নির্ধারিত মাসিক কিস্তি',
  componentsSection: 'স্লিপের বিস্তারিত উপাদান',
  componentType: 'ধরণ',
  componentCode: 'কোড',
  amount: 'পরিমাণ',
  amountWithCurrency: 'পরিমাণ (SAR)',
  notes: 'মন্তব্য',
  noComponents: 'কোনো বিস্তারিত উপাদান সংরক্ষিত নেই',
  componentValueEarning: 'আয়',
  componentValueDeduction: 'কর্তন',
  componentValueInstallment: 'কিস্তি',
  componentValueUnknown: 'উপাদান',
  componentCodeOvertime: 'ওভারটাইম',
  componentCodeTransferRenewal: 'কাফালা স্থানান্তর / নবায়ন',
  componentCodePenalty: 'জরিমানা / শাস্তি',
  componentCodeAdvance: 'অগ্রিম',
  componentCodeOther: 'অন্যান্য কর্তন',
  componentNoteOvertime: 'মাসের ওভারটাইম',
  componentNoteTransferRenewal: 'মাসের কাফালা স্থানান্তর / নবায়ন কর্তন',
  componentNotePenalty: 'মাসের জরিমানা / শাস্তি কর্তন',
  componentNoteAdvance: 'মাসের অগ্রিম কর্তন',
  componentNoteOther: 'মাসের অন্যান্য কর্তন',
  scheduleSection: 'বিস্তারিত কিস্তি সূচি',
  scheduleDueMonth: 'মাস',
  scheduleAmountDue: 'প্রদেয় পরিমাণ',
  schedulePaid: 'পরিশোধিত',
  scheduleRemaining: 'বকেয়া',
  scheduleStatus: 'অবস্থা',
  scheduleTotal: 'মোট',
  scheduleFrom: 'শুরু',
  scheduleCount: 'কিস্তি সংখ্যা',
  schedulePaidCount: 'পরিশোধিত কিস্তি সংখ্যা',
  scheduleRemainingCount: 'বাকি কিস্তি সংখ্যা',
  currentMonth: '◄ বর্তমান',
  noInstallments: 'কোনো কিস্তি নেই',
  oblTypeAdvance: 'অগ্রিম',
  oblTypeTransfer: 'কাফালা স্থানান্তর',
  oblTypeRenewal: 'নবায়ন',
  oblTypePenalty: 'জরিমানা',
  oblTypeOther: 'অন্যান্য দায়',
  statusPaid: 'পরিশোধিত',
  statusPartial: 'আংশিক',
  statusUnpaid: 'অপরিশোধিত',
  statusSkipped: 'স্থগিত',
  statusCancelled: 'বাতিল',
  statusRescheduled: 'পুনর্নির্ধারিত',
  slipNumberLabel: 'স্লিপ নম্বর',
  issuedAtLabel: 'ইস্যুর তারিখ',
  companyFallback: 'ZaFeer',
} as const

type SlipLabels = typeof AR_LABELS | typeof BN_LABELS

export type SlipLang = 'ar' | 'bn'

export interface SlipData {
  slip: { slip_number: string; generated_at: string | null }
  entry: Partial<PayrollEntry>
  components: SlipComponent[]
  obligationPlans: EmployeeObligationPlan[]
  obligationSummary: AllObligationsSummaryRow | null
  payrollRun: { payroll_month: string } | null
  totals: {
    grossAmount: number
    netAmount: number
    deductionsAmount: number
    installmentAmount: number
  }
}

let bengaliFontCache: string | null = null

export async function loadBengaliFont(): Promise<string> {
  if (bengaliFontCache) return bengaliFontCache

  const response = await fetch('/fonts/noto-sans-bengali-subset.woff2')
  if (!response.ok) {
    throw new Error('Failed to load Bengali PDF font')
  }

  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (let i = 0; i < bytes.length; i += 0x8000) {
    const chunk = Array.from(bytes.subarray(i, i + 0x8000))
    binary += String.fromCharCode.apply(null, chunk)
  }

  bengaliFontCache = btoa(binary)
  return bengaliFontCache
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString('en-US')
}

function formatDateTime(value: string | null | undefined, lang: SlipLang): string {
  if (!value) return '-'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return '-'

  return parsedDate.toLocaleString(lang === 'bn' ? 'en-US' : 'en-GB')
}

function formatMonthDisplay(payrollMonth: string, lang: SlipLang): string {
  if (!/^\d{4}-\d{2}$/.test(payrollMonth)) return '-'

  const parsedDate = new Date(`${payrollMonth}-01T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return '-'

  return lang === 'bn'
    ? new Intl.DateTimeFormat('bn-BD-u-nu-latn', { month: 'long', year: 'numeric' }).format(parsedDate)
    : new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric' }).format(parsedDate)
}

function normalizeComponentCode(code?: string | null): KnownComponentCode | null {
  switch ((code || '').toUpperCase()) {
    case 'OVERTIME':
      return 'OVERTIME'
    case 'TRANSFER_RENEWAL':
      return 'TRANSFER_RENEWAL'
    case 'PENALTY':
      return 'PENALTY'
    case 'ADVANCE':
      return 'ADVANCE'
    case 'OTHER':
      return 'OTHER'
    default:
      return null
  }
}

function localizeComponentType(componentType: string | undefined, labels: SlipLabels): string {
  switch ((componentType || '').toLowerCase()) {
    case 'earning':
      return labels.componentValueEarning
    case 'deduction':
      return labels.componentValueDeduction
    case 'installment':
      return labels.componentValueInstallment
    default:
      return labels.componentValueUnknown
  }
}

function localizeComponentCode(code: KnownComponentCode | null, fallback: string | undefined, labels: SlipLabels): string {
  switch (code) {
    case 'OVERTIME':
      return labels.componentCodeOvertime
    case 'TRANSFER_RENEWAL':
      return labels.componentCodeTransferRenewal
    case 'PENALTY':
      return labels.componentCodePenalty
    case 'ADVANCE':
      return labels.componentCodeAdvance
    case 'OTHER':
      return labels.componentCodeOther
    default:
      return fallback || '-'
  }
}

function buildSystemComponentNote(
  code: KnownComponentCode | null,
  payrollMonth: string,
  labels: SlipLabels
): string | null {
  if (!code || !/^\d{4}-\d{2}$/.test(payrollMonth)) return null

  switch (code) {
    case 'OVERTIME':
      return `${labels.componentNoteOvertime} ${payrollMonth}`
    case 'TRANSFER_RENEWAL':
      return `${labels.componentNoteTransferRenewal} ${payrollMonth}`
    case 'PENALTY':
      return `${labels.componentNotePenalty} ${payrollMonth}`
    case 'ADVANCE':
      return `${labels.componentNoteAdvance} ${payrollMonth}`
    case 'OTHER':
      return `${labels.componentNoteOther} ${payrollMonth}`
    default:
      return null
  }
}

function normalizeNoteText(note: string | null | undefined): string {
  return String(note ?? '').trim()
}

function isLikelyGeneratedComponentNote(note: string, payrollMonth: string): boolean {
  if (!note) return false

  const generatedPrefixes = [
    'إضافة عن شهر',
    'استقطاع رسوم نقل وتجديد عن شهر',
    'استقطاع جزاءات وغرامات عن شهر',
    'استقطاع سلفة عن شهر',
    'استقطاع آخر عن شهر',
    'استقطاع ',
    'تمت مزامنة ',
    'মাসের ওভারটাইম',
    'মাসের কাফালা স্থানান্তর / নবায়ন কর্তন',
    'মাসের জরিমানা / শাস্তি কর্তন',
    'মাসের অগ্রিম কর্তন',
    'মাসের অন্যান্য কর্তন',
  ]

  return generatedPrefixes.some((prefix) => note.startsWith(prefix)) ||
    (payrollMonth !== '-' && note.includes(payrollMonth) && note.startsWith('استقطاع '))
}

function buildDisplayComponentNote(
  customNoteRaw: string | null | undefined,
  systemNote: string | null
): string {
  const customNote = normalizeNoteText(customNoteRaw)

  if (!systemNote) return customNote || '-'
  if (!customNote) return systemNote

  if (
    customNote === systemNote ||
    customNote.includes(systemNote) ||
    systemNote.includes(customNote)
  ) {
    return customNote.length >= systemNote.length ? customNote : systemNote
  }

  if (isLikelyGeneratedComponentNote(customNote, systemNote.match(/\d{4}-\d{2}/)?.[0] || '-')) {
    return systemNote
  }

  return `${systemNote} - ${customNote}`
}

export function localizeSlipComponentDisplay(
  component: SlipComponent,
  payrollMonth: string,
  lang: SlipLang
): { typeLabel: string; codeLabel: string; noteLabel: string } {
  const labels = lang === 'bn' ? BN_LABELS : AR_LABELS
  const code = normalizeComponentCode(component.component_code)
  const systemNote = buildSystemComponentNote(code, payrollMonth, labels)

  return {
    typeLabel: localizeComponentType(component.component_type, labels),
    codeLabel: localizeComponentCode(code, component.component_code, labels),
    noteLabel: buildDisplayComponentNote(component.notes, systemNote),
  }
}

function buildComponentRows(components: SlipComponent[], labels: SlipLabels, payrollMonth: string): string {
  if (components.length === 0) {
    return `<tr><td colspan="4" style="text-align:center;color:#9ca3af">${escapeHtml(labels.noComponents)}</td></tr>`
  }

  return components
    .map((component) => {
      const localizedComponent = localizeSlipComponentDisplay(
        component,
        payrollMonth,
        labels === BN_LABELS ? 'bn' : 'ar'
      )

      return `
        <tr>
          <td>${escapeHtml(localizedComponent.typeLabel)}</td>
          <td>${escapeHtml(localizedComponent.codeLabel)}</td>
          <td style="font-weight:600">${formatAmount(Number(component.amount || 0))}</td>
          <td style="color:#6b7280">${escapeHtml(localizedComponent.noteLabel)}</td>
        </tr>
      `
    })
    .join('')
}

function buildInstallmentScheduleHtml(
  obligationPlans: EmployeeObligationPlan[],
  labels: SlipLabels,
  payrollMonth: string,
  lang: SlipLang,
  obligationLabels: Record<string, string>,
  statusLabels: Record<string, { text: string; color: string }>
): string {
  if (obligationPlans.length === 0) return ''

  const canonicalArabicLabels = new Set<string>([
    AR_LABELS.oblTypeAdvance,
    AR_LABELS.oblTypeTransfer,
    AR_LABELS.oblTypeRenewal,
    AR_LABELS.oblTypePenalty,
    AR_LABELS.oblTypeOther,
  ])

  return obligationPlans
    .map((plan) => {
      const planLines = plan.lines ?? []
      const localizedPlanType = obligationLabels[plan.obligation_type] ?? plan.obligation_type
      const rawPlanTitle = String(plan.title || '').trim()
      const paidInstallmentsCount = planLines.filter((line) => {
        const remaining = Math.max(0, Number(line.amount_due || 0) - Number(line.amount_paid || 0))
        return Number(line.amount_due || 0) > 0 && remaining === 0
      }).length
      const remainingInstallmentsCount = planLines.filter((line) => {
        const remaining = Math.max(0, Number(line.amount_due || 0) - Number(line.amount_paid || 0))
        return remaining > 0
      }).length
      const planTitle =
        lang === 'bn'
          ? ''
          : !rawPlanTitle || rawPlanTitle === localizedPlanType || canonicalArabicLabels.has(rawPlanTitle)
            ? ''
            : rawPlanTitle
      const rows = planLines
        .map((line) => {
          const isCurrent = line.due_month === payrollMonth
          const remaining = Math.max(0, Number(line.amount_due || 0) - Number(line.amount_paid || 0))
          const lineStatus = statusLabels[line.line_status] ?? {
            text: line.line_status,
            color: '#0f172a',
          }

          return `
            <tr style="${isCurrent ? 'background:#fefce8;font-weight:700;' : ''}">
              <td style="${isCurrent ? 'color:#b45309;' : ''}">${escapeHtml(line.due_month)}${isCurrent ? ` ${escapeHtml(labels.currentMonth)}` : ''}</td>
              <td style="text-align:center">${formatAmount(Number(line.amount_due || 0))}</td>
              <td style="text-align:center;color:#15803d">${formatAmount(Number(line.amount_paid || 0))}</td>
              <td style="text-align:center;color:${remaining > 0 ? '#dc2626' : '#15803d'}">${formatAmount(remaining)}</td>
              <td style="text-align:center;color:${lineStatus.color}">${escapeHtml(lineStatus.text)}</td>
            </tr>
          `
        })
        .join('')

      const paidTotal = planLines.reduce((sum, line) => sum + Number(line.amount_paid || 0), 0)
      const remainingTotal = Math.max(0, Number(plan.total_amount || 0) - paidTotal)

      return `
        <div class="plan-block">
          <div class="plan-header">
            <div class="plan-heading">
              <div class="plan-heading-row">
                <span class="plan-badge">${escapeHtml(localizedPlanType)}</span>
                ${planTitle ? `<span class="plan-title-text">${escapeHtml(planTitle)}</span>` : ''}
              </div>
            </div>
            <div class="plan-meta">
              <span class="plan-meta-item">
                <span class="plan-meta-label">${escapeHtml(labels.scheduleTotal)}:</span>
                <strong>${formatAmount(Number(plan.total_amount || 0))}</strong>
                <span class="plan-currency">${escapeHtml(labels.currency)}</span>
              </span>
              <span class="plan-meta-item">
                <span class="plan-meta-label">${escapeHtml(labels.schedulePaid)}:</span>
                <strong style="color:#15803d">${formatAmount(paidTotal)}</strong>
                <span class="plan-currency">${escapeHtml(labels.currency)}</span>
              </span>
              <span class="plan-meta-item">
                <span class="plan-meta-label">${escapeHtml(labels.scheduleRemaining)}:</span>
                <strong style="color:#dc2626">${formatAmount(remainingTotal)}</strong>
                <span class="plan-currency">${escapeHtml(labels.currency)}</span>
              </span>
              <span class="plan-meta-item">
                <span class="plan-meta-label">${escapeHtml(labels.scheduleFrom)}:</span>
                <strong>${escapeHtml(plan.start_month)}</strong>
              </span>
              <span class="plan-meta-item">
                <span class="plan-meta-label">${escapeHtml(labels.scheduleCount)}:</span>
                <strong>${planLines.length}</strong>
              </span>
              <span class="plan-meta-item">
                <span class="plan-meta-label">${escapeHtml(labels.schedulePaidCount)}:</span>
                <strong style="color:#15803d">${paidInstallmentsCount}</strong>
              </span>
              <span class="plan-meta-item">
                <span class="plan-meta-label">${escapeHtml(labels.scheduleRemainingCount)}:</span>
                <strong style="color:#dc2626">${remainingInstallmentsCount}</strong>
              </span>
            </div>
          </div>
          <table class="inst-table">
            <thead>
              <tr>
                <th>${escapeHtml(labels.scheduleDueMonth)}</th>
                <th style="text-align:center">${escapeHtml(labels.scheduleAmountDue)}</th>
                <th style="text-align:center">${escapeHtml(labels.schedulePaid)}</th>
                <th style="text-align:center">${escapeHtml(labels.scheduleRemaining)}</th>
                <th style="text-align:center">${escapeHtml(labels.scheduleStatus)}</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="5" style="text-align:center;color:#9ca3af">${escapeHtml(labels.noInstallments)}</td></tr>`}</tbody>
          </table>
        </div>
      `
    })
    .join('')
}

function buildPdfStyles(lang: SlipLang, bengaliFont?: string): string {
  const fontFace = lang === 'bn'
    ? `@font-face{font-family:'NotoSansBengali';src:url(data:font/woff2;base64,${bengaliFont}) format('woff2');font-weight:400;font-style:normal;}`
    : ''
  const fontFamily = lang === 'bn'
    ? "'NotoSansBengali','Segoe UI','Tahoma','Arial',sans-serif"
    : "'Segoe UI','Tahoma','Arial Unicode MS','Arial',sans-serif"

  return `
    ${fontFace}
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:${fontFamily};
      background:#fff;
      color:#0f172a;
      font-size:14px;
      line-height:1.4;
      direction:${lang === 'bn' ? 'ltr' : 'rtl'};
      unicode-bidi:embed;
      word-spacing:1px;
      letter-spacing:0;
      width:900px;
    }
    .page{background:#fff;overflow:hidden;width:900px;border:1px solid #cbd5e1}
    .header{background:linear-gradient(135deg,#0f766e 0%,#0b5f59 100%);color:#fff;padding:20px 24px;display:flex;flex-direction:${lang === 'bn' ? 'row' : 'row-reverse'};justify-content:space-between;align-items:stretch;gap:20px}
    .header-right{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:${lang === 'bn' ? 'flex-start' : 'center'};text-align:${lang === 'bn' ? 'left' : 'center'}}
    .header-title{font-size:${lang === 'bn' ? '22px' : '30px'};font-weight:800;line-height:1.2}
    .header-sub{margin-top:10px;font-size:14px;color:#ecfeff;line-height:1.6;word-break:break-word;max-width:100%}
    .header-left{width:${lang === 'bn' ? '380px' : '360px'};max-width:44%;min-width:300px;display:flex;align-items:center}
    .header-meta-card{width:100%;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:14px;padding:14px 16px}
    .header-meta-row{display:grid;grid-template-columns:${lang === 'bn' ? 'max-content minmax(0,1fr)' : 'max-content minmax(0,1fr)'};align-items:start;column-gap:10px}
    .header-meta-row + .header-meta-row{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.12)}
    .header-meta-label{color:#d5fbf5;white-space:nowrap;font-size:11px;font-weight:700}
    .header-meta-value{color:#ffffff;font-size:13px;font-weight:800;direction:ltr;unicode-bidi:plaintext;word-break:break-word;overflow-wrap:anywhere;text-align:${lang === 'bn' ? 'left' : 'right'};line-height:1.45}
    .info-bar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid #e2e8f0}
    .info-cell{padding:14px 16px;border-inline-start:1px solid #e2e8f0;min-width:0;overflow:hidden}
    .info-cell:first-child{border-inline-start:none}
    .info-label{font-size:11px;color:#94a3b8;margin-bottom:5px;font-weight:600}
    .info-value{font-size:13px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;line-height:1.45}
    .totals{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:#f8fafc;border-bottom:1px solid #e2e8f0}
    .total-cell{padding:12px 6px;border-inline-start:1px solid #e2e8f0;text-align:center;min-width:0}
    .total-cell:first-child{border-inline-start:none}
    .total-label{font-size:11px;color:#64748b;margin-bottom:8px;font-weight:600}
    .total-value{font-size:18px;font-weight:800;line-height:1}
    .total-gross .total-value{color:#1d4ed8}
    .total-deduction .total-value{color:#dc2626}
    .total-installment .total-value{color:#d97706}
    .total-net{background:#f0fdf4}
    .total-net .total-value{color:#15803d}
    .section{padding:12px 20px}
    .section-title{font-size:13px;font-weight:700;color:#334155;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}
    .detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:16px}
    .detail-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;min-width:0;overflow:hidden}
    .detail-label{font-size:10px;color:#94a3b8;margin-bottom:4px;font-weight:600}
    .detail-value{font-size:14px;font-weight:800;color:#1e293b}
    .obligation-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
    .ob-card{border-radius:6px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0}
    .ob-remaining{background:#fff7ed;border:1px solid #fed7aa}
    .ob-remaining .ob-label{color:#9a3412;font-size:11px;font-weight:700}
    .ob-remaining .ob-value{color:#ea580c;font-size:18px;font-weight:800;white-space:nowrap}
    .ob-monthly{background:#eff6ff;border:1px solid #bfdbfe}
    .ob-monthly .ob-label{color:#1e40af;font-size:11px;font-weight:700}
    .ob-monthly .ob-value{color:#2563eb;font-size:18px;font-weight:800;white-space:nowrap}
    table{width:100%;border-collapse:collapse;table-layout:fixed}
    th{background:#f1f5f9;padding:7px 10px;text-align:${lang === 'bn' ? 'left' : 'right'};font-size:11px;font-weight:700;color:#475569;border-bottom:2px solid #e2e8f0;overflow:hidden}
    td{padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;vertical-align:middle;overflow:hidden;text-overflow:ellipsis;text-align:${lang === 'bn' ? 'left' : 'right'}}
    tr:last-child td{border-bottom:none}
    .plan-block{margin-bottom:14px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
    .plan-header{background:#f8fafc;padding:10px 14px;display:flex;flex-direction:column;align-items:stretch;border-bottom:1px solid #e2e8f0;gap:8px}
    .plan-heading{min-width:0}
    .plan-heading-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:${lang === 'bn' ? 'flex-start' : 'flex-end'}}
    .plan-badge{background:#134e4a;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;white-space:nowrap;flex-shrink:0}
    .plan-title-text{font-size:12px;font-weight:700;color:#1e293b;min-width:0;overflow:hidden;text-overflow:ellipsis}
    .plan-meta{width:100%;display:flex;gap:8px 14px;font-size:10px;color:#64748b;flex-wrap:wrap;justify-content:${lang === 'bn' ? 'flex-start' : 'flex-end'};align-items:center}
    .plan-meta-item{display:inline-flex;align-items:baseline;gap:4px;white-space:nowrap}
    .plan-meta-label{color:#64748b}
    .plan-meta strong{font-weight:700}
    .plan-currency{font-weight:700}
    .inst-table{table-layout:fixed}
    .inst-table th,.inst-table td{font-size:11px;padding:7px 10px}
    .footer{background:#f1f5f9;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;gap:12px}
    .footer-slip{font-size:10px;color:#475569;font-weight:700;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .footer-date{font-size:10px;color:#94a3b8;white-space:nowrap;flex-shrink:0}
    @media (max-width: 900px){
      .header{flex-direction:column;gap:12px}
      .header-left{width:100%;max-width:100%;min-width:0}
    }
  `
}

export function buildSlipHtml(data: SlipData, lang: SlipLang, bengaliFont?: string): string {
  if (lang === 'bn' && !bengaliFont) {
    throw new Error('bengaliFont required for BN lang')
  }

  const labels = lang === 'bn' ? BN_LABELS : AR_LABELS
  const obligationLabels =
    lang === 'bn'
      ? {
          advance: BN_LABELS.oblTypeAdvance,
          transfer: BN_LABELS.oblTypeTransfer,
          renewal: BN_LABELS.oblTypeRenewal,
          penalty: BN_LABELS.oblTypePenalty,
          other: BN_LABELS.oblTypeOther,
        }
      : {
          advance: AR_LABELS.oblTypeAdvance,
          transfer: AR_LABELS.oblTypeTransfer,
          renewal: AR_LABELS.oblTypeRenewal,
          penalty: AR_LABELS.oblTypePenalty,
          other: AR_LABELS.oblTypeOther,
        }
  const statusLabels =
    lang === 'bn'
      ? {
          paid: { text: BN_LABELS.statusPaid, color: '#15803d' },
          unpaid: { text: BN_LABELS.statusUnpaid, color: '#dc2626' },
          partial: { text: BN_LABELS.statusPartial, color: '#d97706' },
          skipped: { text: BN_LABELS.statusSkipped, color: '#6b7280' },
          cancelled: { text: BN_LABELS.statusCancelled, color: '#6b7280' },
          rescheduled: { text: BN_LABELS.statusRescheduled, color: '#7c3aed' },
        }
      : {
          paid: { text: AR_LABELS.statusPaid, color: '#15803d' },
          unpaid: { text: AR_LABELS.statusUnpaid, color: '#dc2626' },
          partial: { text: AR_LABELS.statusPartial, color: '#d97706' },
          skipped: { text: AR_LABELS.statusSkipped, color: '#6b7280' },
          cancelled: { text: AR_LABELS.statusCancelled, color: '#6b7280' },
          rescheduled: { text: AR_LABELS.statusRescheduled, color: '#7c3aed' },
        }

  const payrollMonth = /^\d{4}-\d{2}/.test(data.payrollRun?.payroll_month ?? '')
    ? String(data.payrollRun?.payroll_month).slice(0, 7)
    : '-'
  const monthDisplay = formatMonthDisplay(payrollMonth, lang)
  const totalRemaining = data.obligationSummary?.total_remaining ?? 0
  const totalMonthly = data.obligationSummary?.total_monthly ?? 0
  const companyName =
    data.entry.company_name_snapshot || data.entry.project_name_snapshot || labels.companyFallback
  const headerSubHtml = lang === 'bn'
    ? ''
    : `<div class="header-sub" dir="auto">${escapeHtml(companyName)}</div>`
  const componentRows = buildComponentRows(data.components, labels, payrollMonth)
  const installmentScheduleHtml = buildInstallmentScheduleHtml(
    data.obligationPlans,
    labels,
    payrollMonth,
    lang,
    obligationLabels,
    statusLabels
  )
  const slipDateTime = formatDateTime(data.slip.generated_at, lang)
  const residenceStyle = lang === 'bn'
    ? 'direction:ltr;text-align:left'
    : 'direction:ltr;text-align:right'

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${lang === 'bn' ? 'ltr' : 'rtl'}">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(data.slip.slip_number)}</title>
<style>
${buildPdfStyles(lang, bengaliFont)}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-right">
      <div class="header-title">${escapeHtml(labels.title)}</div>
      ${headerSubHtml}
    </div>
    <div class="header-left">
      <div class="header-meta-card">
        <div class="header-meta-row">
          <span class="header-meta-label">${escapeHtml(labels.slipNumber)}:</span>
          <span class="header-meta-value">${escapeHtml(data.slip.slip_number)}</span>
        </div>
        <div class="header-meta-row">
          <span class="header-meta-label">${escapeHtml(labels.month)}:</span>
          <span class="header-meta-value">${escapeHtml(monthDisplay)}</span>
        </div>
        <div class="header-meta-row">
          <span class="header-meta-label">${escapeHtml(labels.date)}:</span>
          <span class="header-meta-value">${escapeHtml(slipDateTime)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="info-bar">
    <div class="info-cell">
      <div class="info-label">${escapeHtml(labels.employee)}</div>
      <div class="info-value" dir="auto">${escapeHtml(data.entry.employee_name_snapshot || '-')}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">${escapeHtml(labels.residenceNumber)}</div>
      <div class="info-value" style="${residenceStyle}">${escapeHtml(data.entry.residence_number_snapshot || '-')}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">${escapeHtml(labels.companyProject)}</div>
      <div class="info-value" dir="auto">${escapeHtml(companyName)}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">${escapeHtml(labels.basicSalary)}</div>
      <div class="info-value">${formatAmount(Number(data.entry.basic_salary_snapshot || 0))} ${escapeHtml(labels.currency)}</div>
    </div>
  </div>

  <div class="totals">
    <div class="total-cell total-gross">
      <div class="total-label">${escapeHtml(labels.grossSalary)}</div>
      <div class="total-value">${formatAmount(data.totals.grossAmount)}</div>
    </div>
    <div class="total-cell total-deduction">
      <div class="total-label">${escapeHtml(labels.totalDeductions)}</div>
      <div class="total-value">${formatAmount(data.totals.deductionsAmount + data.totals.installmentAmount)}</div>
    </div>
    <div class="total-cell total-installment">
      <div class="total-label">${escapeHtml(labels.installmentDeduction)}</div>
      <div class="total-value">${formatAmount(data.totals.installmentAmount)}</div>
    </div>
    <div class="total-cell total-net">
      <div class="total-label">${escapeHtml(labels.netSalary)}</div>
      <div class="total-value">${formatAmount(data.totals.netAmount)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(labels.attendanceSection)}</div>
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">${escapeHtml(labels.attendanceDays)}</div>
        <div class="detail-value">${Number(data.entry.attendance_days || 0)} ${escapeHtml(labels.dayUnit)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">${escapeHtml(labels.paidLeaveDays)}</div>
        <div class="detail-value">${Number(data.entry.paid_leave_days || 0)} ${escapeHtml(labels.dayUnit)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">${escapeHtml(labels.overtime)}</div>
        <div class="detail-value">${formatAmount(Number(data.entry.overtime_amount || 0))} ${escapeHtml(labels.currency)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">${escapeHtml(labels.penalties)}</div>
        <div class="detail-value">${formatAmount(data.totals.deductionsAmount)} ${escapeHtml(labels.currency)}</div>
      </div>
    </div>

    ${totalRemaining > 0 || totalMonthly > 0 ? `
      <div class="section-title">${escapeHtml(labels.obligationsSection)}</div>
      <div class="obligation-grid">
        <div class="ob-card ob-remaining">
          <div><div class="ob-label">${escapeHtml(labels.totalRemaining)}</div></div>
          <div class="ob-value">${formatAmount(totalRemaining)} ${escapeHtml(labels.currency)}</div>
        </div>
        <div class="ob-card ob-monthly">
          <div><div class="ob-label">${escapeHtml(labels.monthlyInstallment)}</div></div>
          <div class="ob-value">${formatAmount(totalMonthly)} ${escapeHtml(labels.currency)}</div>
        </div>
      </div>
    ` : ''}

    <div class="section-title">${escapeHtml(labels.componentsSection)}</div>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(labels.componentType)}</th>
          <th>${escapeHtml(labels.componentCode)}</th>
          <th>${escapeHtml(labels.amountWithCurrency)}</th>
          <th>${escapeHtml(labels.notes)}</th>
        </tr>
      </thead>
      <tbody>${componentRows}</tbody>
    </table>
  </div>

  ${installmentScheduleHtml ? `
    <div class="section">
      <div class="section-title">${escapeHtml(labels.scheduleSection)}</div>
      ${installmentScheduleHtml}
    </div>
  ` : ''}

  <div class="footer">
    <div class="footer-slip">${escapeHtml(labels.slipNumberLabel)}: ${escapeHtml(data.slip.slip_number)}</div>
    <div class="footer-date">${escapeHtml(labels.issuedAtLabel)}: ${escapeHtml(slipDateTime)}</div>
  </div>
</div>
</body>
</html>`
}

export async function captureSlip(html: string): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas')
  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:fixed;visibility:hidden;width:980px;height:4000px;z-index:-9999;top:0;left:0;pointer-events:none;border:none;'
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      throw new Error('iframe contentDocument unavailable')
    }

    iframeDoc.open()
    iframeDoc.write(html)
    iframeDoc.close()

    await iframeDoc.fonts.ready
    await new Promise((resolve) => setTimeout(resolve, 50))

    const page = iframeDoc.querySelector<HTMLElement>('.page') ?? iframeDoc.body

    return await html2canvas(page, {
      scale: 2,
      foreignObjectRendering: true,
      windowWidth: 900,
      backgroundColor: '#ffffff',
      logging: false,
    })
  } finally {
    document.body.removeChild(iframe)
  }
}
