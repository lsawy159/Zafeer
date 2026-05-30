import { Employee } from '../../lib/supabase'
import { EmployeeAlert, getEmployeeNotificationThresholdsPublic } from './employeeAlertThresholds'

export async function checkContractExpiry(employee: Employee): Promise<EmployeeAlert | null> {
  if (!employee.contract_expiry) {
    return null
  }

  const today = new Date()
  const expiryDate = new Date(employee.contract_expiry)
  const timeDiff = expiryDate.getTime() - today.getTime()
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

  const thresholds = await getEmployeeNotificationThresholdsPublic()

  if (daysRemaining > thresholds.contract_medium_days) {
    return null
  }

  let priority: EmployeeAlert['priority']
  let title: string
  let message: string
  let actionRequired: string

  if (daysRemaining < 0) {
    priority = 'urgent'
    const daysExpired = Math.abs(daysRemaining)
    title = 'عقد منتهي'
    message = `انتهت صلاحية عقد الموظف "${employee.name}" منذ ${daysExpired} يوم. يجب تجديد العقد فوراً لتجنب المشاكل القانونية.`
    actionRequired = `قم بتجديد عقد الموظف "${employee.name}" في أقرب وقت ممكن لضمان استمرار العمل القانوني.`
  } else if (daysRemaining <= thresholds.contract_urgent_days) {
    priority = 'urgent'
    title = 'انتهاء عقد'
    message = `ينتهي عقد الموظف "${employee.name}" خلال ${daysRemaining} يوم. يجب تجديده فوراً.`
    actionRequired = `قم بترتيب تجديد عقد الموظف "${employee.name}" خلال ${daysRemaining} يوم القادمة.`
  } else if (
    daysRemaining <= (thresholds.contract_high_days || thresholds.contract_urgent_days + 8)
  ) {
    priority = 'high'
    title = 'انتهاء عقد'
    message = `ينتهي عقد الموظف "${employee.name}" خلال ${daysRemaining} يوم. يجب تجديده قريباً.`
    actionRequired = `قم بترتيب تجديد عقد الموظف "${employee.name}" خلال ${daysRemaining} يوم القادمة.`
  } else if (daysRemaining <= thresholds.contract_medium_days) {
    priority = 'medium'
    title = 'انتهاء عقد'
    message = `ينتهي عقد الموظف "${employee.name}" خلال ${daysRemaining} يوم. يفضل تجديده قبل انتهاء المدة.`
    actionRequired = `قم بمراجعة وتجديد عقد الموظف "${employee.name}" خلال الشهر القادم.`
  } else {
    priority = 'low'
    title = 'متابعة العقد'
    message = `عقد الموظف "${employee.name}" سينتهي خلال ${daysRemaining} يوم.`
    actionRequired = `قم بمتابعة تجديد عقد الموظف "${employee.name}" عند الحاجة.`
  }

  return {
    id: `contract_${employee.id}_${employee.contract_expiry}`,
    type: 'contract_expiry',
    priority,
    title,
    message,
    employee: {
      id: employee.id,
      name: employee.name,
      profession: employee.profession,
      nationality: employee.nationality,
      company_id: employee.company_id,
    },
    company: { id: '', name: '', commercial_registration_number: '' },
    expiry_date: employee.contract_expiry,
    days_remaining: daysRemaining,
    action_required: actionRequired,
    created_at: new Date().toISOString(),
  }
}

export async function checkResidenceExpiry(employee: Employee): Promise<EmployeeAlert | null> {
  if (!employee.residence_expiry) {
    return null
  }

  const today = new Date()
  const expiryDate = new Date(employee.residence_expiry)
  const timeDiff = expiryDate.getTime() - today.getTime()
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

  const thresholds = await getEmployeeNotificationThresholdsPublic()

  if (daysRemaining > thresholds.residence_medium_days) {
    return null
  }

  let priority: EmployeeAlert['priority']
  let title: string
  let message: string
  let actionRequired: string

  if (daysRemaining < 0) {
    priority = 'urgent'
    const daysExpired = Math.abs(daysRemaining)
    title = 'إقامة منتهية الصلاحية'
    message = `انتهت صلاحية إقامة الموظف "${employee.name}" منذ ${daysExpired} يوم. يجب تجديدها فوراً لتجنب المشاكل القانونية.`
    actionRequired = `قم بتجديد إقامة الموظف "${employee.name}" في أقرب وقت ممكن لضمان وضعه القانوني.`
  } else if (daysRemaining <= thresholds.residence_urgent_days) {
    priority = 'urgent'
    title = 'إقامة تنتهي هذا الأسبوع'
    message = `تنتهي إقامة الموظف "${employee.name}" خلال ${daysRemaining} يوم. يجب تجديدها فوراً.`
    actionRequired = `قم بترتيب تجديد إقامة الموظف "${employee.name}" خلال ${daysRemaining} يوم القادمة.`
  } else if (
    daysRemaining <= (thresholds.residence_high_days || thresholds.residence_urgent_days + 8)
  ) {
    priority = 'high'
    title = 'إقامة عاجل'
    message = `تنتهي إقامة الموظف "${employee.name}" خلال ${daysRemaining} يوم. يجب تجديدها قريباً.`
    actionRequired = `قم بترتيب تجديد إقامة الموظف "${employee.name}" خلال ${daysRemaining} يوم القادمة.`
  } else if (daysRemaining <= thresholds.residence_medium_days) {
    priority = 'medium'
    title = 'إقامة عاجل'
    message = `تنتهي إقامة الموظف "${employee.name}" خلال ${daysRemaining} يوم. يفضل تجديدها قبل انتهاء المدة.`
    actionRequired = `قم بمراجعة وتجديد إقامة الموظف "${employee.name}" خلال الشهر القادم.`
  } else {
    priority = 'low'
    title = 'متابعة الإقامة'
    message = `إقامة الموظف "${employee.name}" ستنتهي خلال ${daysRemaining} يوم.`
    actionRequired = `قم بمتابعة تجديد إقامة الموظف "${employee.name}" عند الحاجة.`
  }

  return {
    id: `residence_${employee.id}_${employee.residence_expiry}`,
    type: 'residence_expiry',
    priority,
    title,
    message,
    employee: {
      id: employee.id,
      name: employee.name,
      profession: employee.profession,
      nationality: employee.nationality,
      company_id: employee.company_id,
    },
    company: { id: '', name: '', commercial_registration_number: '' },
    expiry_date: employee.residence_expiry,
    days_remaining: daysRemaining,
    action_required: actionRequired,
    created_at: new Date().toISOString(),
  }
}

export async function checkHealthInsuranceExpiry(
  employee: Employee
): Promise<EmployeeAlert | null> {
  if (!employee.health_insurance_expiry) {
    return null
  }

  const today = new Date()
  const expiryDate = new Date(employee.health_insurance_expiry)
  const timeDiff = expiryDate.getTime() - today.getTime()
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

  const thresholds = await getEmployeeNotificationThresholdsPublic()

  if (daysRemaining > thresholds.health_insurance_medium_days) {
    return null
  }

  let priority: EmployeeAlert['priority']
  let title: string
  let message: string
  let actionRequired: string

  if (daysRemaining < 0) {
    priority = 'urgent'
    const daysExpired = Math.abs(daysRemaining)
    title = 'التأمين الصحي منتهي'
    message = `انتهت صلاحية التأمين الصحي للموظف "${employee.name}" منذ ${daysExpired} يوم. يجب تجديده فوراً لتجنب المشاكل الصحية والقانونية.`
    actionRequired = `قم بتجديد التأمين الصحي للموظف "${employee.name}" في أقرب وقت ممكن لضمان حمايته الصحية.`
  } else if (daysRemaining <= thresholds.health_insurance_urgent_days) {
    priority = 'urgent'
    title = 'التأمين الصحي عاجل'
    message = `ينتهي التأمين الصحي للموظف "${employee.name}" خلال ${daysRemaining} يوم. يجب تجديده فوراً.`
    actionRequired = `قم بترتيب تجديد التأمين الصحي للموظف "${employee.name}" خلال ${daysRemaining} يوم القادمة.`
  } else if (
    daysRemaining <=
    (thresholds.health_insurance_high_days || thresholds.health_insurance_urgent_days + 15)
  ) {
    priority = 'high'
    title = 'التأمين الصحي عاجل'
    message = `ينتهي التأمين الصحي للموظف "${employee.name}" خلال ${daysRemaining} يوم. يجب تجديده قريباً.`
    actionRequired = `قم بترتيب تجديد التأمين الصحي للموظف "${employee.name}" خلال ${daysRemaining} يوم القادمة.`
  } else if (daysRemaining <= thresholds.health_insurance_medium_days) {
    priority = 'medium'
    title = 'التأمين الصحي عاجل'
    message = `ينتهي التأمين الصحي للموظف "${employee.name}" خلال ${daysRemaining} يوم. يفضل تجديده قبل انتهاء المدة.`
    actionRequired = `قم بمراجعة وتجديد التأمين الصحي للموظف "${employee.name}" خلال الشهر القادم.`
  } else {
    priority = 'low'
    title = 'متابعة التأمين الصحي'
    message = `التأمين الصحي للموظف "${employee.name}" سينتهي خلال ${daysRemaining} يوم.`
    actionRequired = `قم بمتابعة تجديد التأمين الصحي للموظف "${employee.name}" عند الحاجة.`
  }

  return {
    id: `health_insurance_${employee.id}_${employee.health_insurance_expiry}`,
    type: 'health_insurance_expiry',
    priority,
    title,
    message,
    employee: {
      id: employee.id,
      name: employee.name,
      profession: employee.profession,
      nationality: employee.nationality,
      company_id: employee.company_id,
    },
    company: { id: '', name: '', commercial_registration_number: '' },
    expiry_date: employee.health_insurance_expiry,
    days_remaining: daysRemaining,
    action_required: actionRequired,
    created_at: new Date().toISOString(),
  }
}

export async function checkHiredWorkerContractExpiry(
  employee: Employee
): Promise<EmployeeAlert | null> {
  if (!employee.hired_worker_contract_expiry) {
    return null
  }

  const today = new Date()
  const expiryDate = new Date(employee.hired_worker_contract_expiry)
  const timeDiff = expiryDate.getTime() - today.getTime()
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

  const thresholds = await getEmployeeNotificationThresholdsPublic()

  const urgentDays = thresholds.hired_worker_contract_urgent_days ?? thresholds.contract_urgent_days
  const highDays = thresholds.hired_worker_contract_high_days ?? thresholds.contract_high_days
  const mediumDays = thresholds.hired_worker_contract_medium_days ?? thresholds.contract_medium_days

  if (daysRemaining > mediumDays) {
    return null
  }

  let priority: EmployeeAlert['priority']
  let title: string
  let message: string
  let actionRequired: string

  if (daysRemaining < 0) {
    priority = 'urgent'
    const daysExpired = Math.abs(daysRemaining)
    title = 'عقد أجير منتهي'
    message = `انتهت صلاحية عقد أجير الموظف "${employee.name}" منذ ${daysExpired} يوم. يجب تجديد العقد فوراً لتجنب المشاكل القانونية.`
    actionRequired = `قم بتجديد عقد أجير الموظف "${employee.name}" في أقرب وقت ممكن لضمان استمرار العمل القانوني.`
  } else if (daysRemaining <= urgentDays) {
    priority = 'urgent'
    title = 'انتهاء عقد أجير'
    message = `ينتهي عقد أجير الموظف "${employee.name}" خلال ${daysRemaining} يوم. يجب تجديده فوراً.`
    actionRequired = `قم بترتيب تجديد عقد أجير الموظف "${employee.name}" خلال ${daysRemaining} يوم القادمة.`
  } else if (daysRemaining <= (highDays || urgentDays + 8)) {
    priority = 'high'
    title = 'انتهاء عقد أجير'
    message = `ينتهي عقد أجير الموظف "${employee.name}" خلال ${daysRemaining} يوم. يجب تجديده قريباً.`
    actionRequired = `قم بترتيب تجديد عقد أجير الموظف "${employee.name}" خلال ${daysRemaining} يوم القادمة.`
  } else if (daysRemaining <= mediumDays) {
    priority = 'medium'
    title = 'انتهاء عقد أجير'
    message = `ينتهي عقد أجير الموظف "${employee.name}" خلال ${daysRemaining} يوم. يفضل تجديده قبل انتهاء المدة.`
    actionRequired = `قم بمراجعة وتجديد عقد أجير الموظف "${employee.name}" خلال الشهر القادم.`
  } else {
    priority = 'low'
    title = 'متابعة عقد أجير'
    message = `عقد أجير الموظف "${employee.name}" سينتهي خلال ${daysRemaining} يوم.`
    actionRequired = `قم بمتابعة تجديد عقد أجير الموظف "${employee.name}" عند الحاجة.`
  }

  return {
    id: `hired_worker_contract_${employee.id}_${employee.hired_worker_contract_expiry}`,
    type: 'hired_worker_contract_expiry',
    priority,
    title,
    message,
    employee: {
      id: employee.id,
      name: employee.name,
      profession: employee.profession,
      nationality: employee.nationality,
      company_id: employee.company_id,
    },
    company: { id: '', name: '', commercial_registration_number: '' },
    expiry_date: employee.hired_worker_contract_expiry,
    days_remaining: daysRemaining,
    action_required: actionRequired,
    created_at: new Date().toISOString(),
  }
}

/** @deprecated Use checkHealthInsuranceExpiry instead */
export async function checkInsuranceExpiry(employee: Employee): Promise<EmployeeAlert | null> {
  return checkHealthInsuranceExpiry(employee)
}
