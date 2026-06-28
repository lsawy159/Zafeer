import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_APP_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

// CORS عبر allowlist: نعكس الـ Origin فقط لو ضمن النطاقات المسموح بها (Spec 080 US4)
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-action',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim() ?? ''
  if (!token) {
    return jsonResponse({ error: 'انتهت جلسة العمل، أعد تسجيل الدخول' }, 401)
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const {
    data: { user },
    error: authError,
  } = await anonClient.auth.getUser(token)

  if (authError || !user) {
    return jsonResponse({ error: 'انتهت جلسة العمل، أعد تسجيل الدخول' }, 401)
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('role, permissions, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.is_active !== true) {
    return jsonResponse({ error: 'غير مصرّح لك بهذه العملية' }, 403)
  }

  const isAdmin = profile.role === 'admin'
  const permissions = profile.permissions
  const hasPermission = (permission: string) => {
    if (isAdmin) return true
    if (Array.isArray(permissions)) return permissions.includes(permission)
    if (permissions && typeof permissions === 'object') {
      const permissionMap = permissions as Record<string, unknown>
      if (permissionMap[permission] === true) return true

      const [section, action] = permission.split('.')
      const sectionPermissions = section ? permissionMap[section] : undefined
      if (action && sectionPermissions && typeof sectionPermissions === 'object') {
        return (sectionPermissions as Record<string, unknown>)[action] === true
      }
    }
    return false
  }
  const action = req.headers.get('x-action')

  // ──────────────────────────────
  // حذف مشروع واحد
  // ──────────────────────────────
  if (action === 'delete') {
    if (!hasPermission('projects.delete')) {
      return jsonResponse({ error: 'Forbidden: projects.delete permission required' }, 403)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'حدث خطأ في البيانات المرسلة' }, 400)
    }

    const id = body.id
    if (!isValidUuid(id)) {
      return jsonResponse({ error: 'معرّف المشروع غير صالح' }, 400)
    }

    const { data: project } = await adminClient
      .from('projects')
      .select('id, name')
      .eq('id', id)
      .is('is_deleted', false)
      .maybeSingle()

    if (!project) {
      return jsonResponse({ error: 'المشروع غير موجود' }, 404)
    }

    const { data: activeEmployees } = await adminClient
      .from('employees')
      .select('id')
      .eq('project_id', id)
      .or('is_deleted.is.null,is_deleted.eq.false')

    if (activeEmployees && activeEmployees.length > 0) {
      return jsonResponse({ error: 'لا يمكن حذف المشروع لأنه يحتوي على موظفين نشطين' }, 409)
    }

    const { error: deleteError } = await adminClient
      .from('projects')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      return jsonResponse({ error: 'فشل حذف المشروع' }, 500)
    }

    await adminClient.from('activity_log').insert({
      user_id: user.id,
      entity_type: 'project',
      entity_id: id,
      action: 'حذف مشروع',
      details: { project_name: (project as { name?: string }).name ?? '—' },
    })

    return jsonResponse({ success: true, projectId: id })
  }

  // ──────────────────────────────
  // حذف متعدد
  // ──────────────────────────────
  if (action === 'bulk-delete') {
    if (!hasPermission('projects.delete')) {
      return jsonResponse({ error: 'Forbidden: projects.delete permission required' }, 403)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'حدث خطأ في البيانات المرسلة' }, 400)
    }

    const ids = body.ids
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isValidUuid)) {
      return jsonResponse({ error: 'قائمة المشاريع غير صالحة' }, 400)
    }

    if (ids.length > 50) {
      return jsonResponse({ error: 'لا يمكن حذف أكثر من 50 مشروعاً في المرة الواحدة' }, 400)
    }

    // جلب أسماء المشاريع دفعة واحدة قبل الحذف
    const { data: projectsData } = await adminClient
      .from('projects')
      .select('id, name')
      .in('id', ids)
    const projectNamesMap = new Map((projectsData ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))

    const results: { id: string; success: boolean; error?: string }[] = []

    for (const id of ids) {
      const { data: activeEmployees } = await adminClient
        .from('employees')
        .select('id')
        .eq('project_id', id)
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (activeEmployees && activeEmployees.length > 0) {
        results.push({ id, success: false, error: 'يحتوي على موظفين نشطين' })
        continue
      }

      const { error: deleteError } = await adminClient
        .from('projects')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('is_deleted', false)

      if (deleteError) {
        results.push({ id, success: false, error: 'فشل الحذف' })
        continue
      }

      await adminClient.from('activity_log').insert({
        user_id: user.id,
        entity_type: 'project',
        entity_id: id,
        action: 'حذف مشروع',
        details: { project_name: projectNamesMap.get(id) ?? '—' },
      })

      results.push({ id, success: true })
    }

    const deletedCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    return jsonResponse({ success: true, deletedCount, failedCount, results })
  }

  if (action === 'delete-extract') {
    if (!hasPermission('extracts.delete')) {
      return jsonResponse({ error: 'Forbidden: extracts.delete permission required' }, 403)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const id = body.id
    if (!isValidUuid(id)) {
      return jsonResponse({ error: 'Invalid extract id' }, 400)
    }

    const { data: extract, error: extractError } = await adminClient
      .from('extract_invoices')
      .select('id, project_id')
      .eq('id', id)
      .maybeSingle()

    if (extractError) {
      return jsonResponse({ error: 'Failed to load extract' }, 500)
    }
    if (!extract) {
      return jsonResponse({ error: 'Extract not found' }, 404)
    }

    const { error: deleteError } = await adminClient
      .from('extract_invoices')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return jsonResponse({ error: 'Failed to delete extract' }, 500)
    }

    await adminClient.from('activity_log').insert({
      user_id: user.id,
      entity_type: 'extract',
      entity_id: id,
      action: 'delete',
      details: { project_id: extract.project_id },
    })

    return jsonResponse({ success: true, extractId: id })
  }

  if (action === 'delete-extract-line') {
    if (!hasPermission('extracts.edit')) {
      return jsonResponse({ error: 'Forbidden: extracts.edit permission required' }, 403)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const lineId = body.lineId
    if (!isValidUuid(lineId)) {
      return jsonResponse({ error: 'Invalid extract line id' }, 400)
    }

    const { data: line, error: lineError } = await adminClient
      .from('extract_invoice_lines')
      .select('id, invoice_id')
      .eq('id', lineId)
      .maybeSingle()

    if (lineError) {
      return jsonResponse({ error: 'Failed to load extract line' }, 500)
    }
    if (!line) {
      return jsonResponse({ error: 'Extract line not found' }, 404)
    }

    const { error: deleteError } = await adminClient
      .from('extract_invoice_lines')
      .delete()
      .eq('id', lineId)

    if (deleteError) {
      return jsonResponse({ error: 'Failed to delete extract line' }, 500)
    }

    await adminClient.rpc('recalculate_extract_totals', { p_invoice_id: line.invoice_id })
    await adminClient.from('activity_log').insert({
      user_id: user.id,
      entity_type: 'extract_line',
      entity_id: lineId,
      action: 'delete',
      details: { invoice_id: line.invoice_id },
    })

    return jsonResponse({ success: true })
  }

  if (action === 'add-extract-line') {
    if (!hasPermission('extracts.edit')) {
      return jsonResponse({ error: 'Forbidden: extracts.edit permission required' }, 403)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const id = body.id
    const employeeId = body.employeeId
    const attendanceDays = Number(body.attendanceDays)
    if (!isValidUuid(id) || !isValidUuid(employeeId) || !Number.isFinite(attendanceDays) || attendanceDays < 0) {
      return jsonResponse({ error: 'Invalid extract line input' }, 400)
    }

    const { data: extract, error: extractError } = await adminClient
      .from('extract_invoices')
      .select('id, project_id, total_days_in_month')
      .eq('id', id)
      .maybeSingle()

    if (extractError) {
      return jsonResponse({ error: 'Failed to load extract' }, 500)
    }
    if (!extract) {
      return jsonResponse({ error: 'Extract not found' }, 404)
    }

    const totalDaysInMonth = Number(extract.total_days_in_month)
    if (!Number.isFinite(totalDaysInMonth) || totalDaysInMonth <= 0) {
      return jsonResponse({ error: 'عدد أيام الشهر غير صالح لهذا المستخلص' }, 400)
    }

    const { data: employee, error: empError } = await adminClient
      .from('employees')
      .select('id, name, profession, residence_number')
      .eq('id', employeeId)
      .maybeSingle()

    if (empError) {
      return jsonResponse({ error: 'Failed to load employee' }, 500)
    }
    if (!employee) {
      return jsonResponse({ error: 'Employee not found' }, 400)
    }

    const profession = String(employee.profession ?? '').trim()
    if (!profession) {
      return jsonResponse({ error: 'Employee has no profession' }, 400)
    }

    const { data: rateRow, error: rateError } = await adminClient
      .from('project_job_title_rates')
      .select('monthly_rate')
      .eq('project_id', extract.project_id)
      .ilike('profession', profession)
      .maybeSingle()

    if (rateError) {
      return jsonResponse({ error: 'Failed to load job title rate' }, 500)
    }
    if (!rateRow) {
      return jsonResponse({ error: `No rate found for profession "${profession}" in this project` }, 400)
    }

    const monthlyRate = Number(rateRow.monthly_rate)
    const amount = (monthlyRate / totalDaysInMonth) * attendanceDays
    if (!Number.isFinite(amount)) {
      return jsonResponse({ error: 'تعذّر احتساب قيمة السطر' }, 400)
    }

    const { data: newLine, error: insertError } = await adminClient
      .from('extract_invoice_lines')
      .insert({
        invoice_id: id,
        employee_id: employee.id,
        employee_name_snapshot: employee.name,
        residence_number_snapshot: employee.residence_number ?? 0,
        profession_snapshot: profession,
        monthly_rate_snapshot: monthlyRate,
        attendance_days: attendanceDays,
        total_days_in_month: totalDaysInMonth,
        amount,
      })
      .select()
      .single()

    if (insertError || !newLine) {
      return jsonResponse({ error: 'Failed to insert extract line' }, 500)
    }

    await adminClient.rpc('recalculate_extract_totals', { p_invoice_id: id })
    await adminClient.from('activity_log').insert({
      user_id: user.id,
      entity_type: 'extract_line',
      entity_id: newLine.id,
      action: 'create',
      details: { extract_id: id, employee_id: employee.id, amount },
    })

    return jsonResponse(newLine, 201)
  }

  if (action === 'update-extract-line') {
    if (!hasPermission('extracts.edit')) {
      return jsonResponse({ error: 'Forbidden: extracts.edit permission required' }, 403)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid request body' }, 400)
    }

    const lineId = body.lineId
    const attendanceDays = Number(body.attendanceDays)
    const totalDaysInMonth = Number(body.totalDaysInMonth)
    const monthlyRate = Number(body.monthlyRate)
    if (
      !isValidUuid(lineId) ||
      !Number.isFinite(attendanceDays) ||
      !Number.isFinite(totalDaysInMonth) ||
      !Number.isFinite(monthlyRate) ||
      attendanceDays < 0 ||
      totalDaysInMonth <= 0
    ) {
      return jsonResponse({ error: 'Invalid extract line input' }, 400)
    }

    const { data: line, error: lineError } = await adminClient
      .from('extract_invoice_lines')
      .select('id, invoice_id')
      .eq('id', lineId)
      .maybeSingle()

    if (lineError) {
      return jsonResponse({ error: 'Failed to load extract line' }, 500)
    }
    if (!line) {
      return jsonResponse({ error: 'Extract line not found' }, 404)
    }

    const amount = (monthlyRate / totalDaysInMonth) * attendanceDays
    const { error: updateError } = await adminClient
      .from('extract_invoice_lines')
      .update({ attendance_days: attendanceDays, total_days_in_month: totalDaysInMonth, amount })
      .eq('id', lineId)

    if (updateError) {
      return jsonResponse({ error: 'Failed to update extract line' }, 500)
    }

    await adminClient.rpc('recalculate_extract_totals', { p_invoice_id: line.invoice_id })
    await adminClient.from('activity_log').insert({
      user_id: user.id,
      entity_type: 'extract_line',
      entity_id: lineId,
      action: 'update',
      details: { attendance_days: attendanceDays, amount },
    })

    return jsonResponse({ success: true })
  }

  return jsonResponse({ error: 'إجراء غير معروف' }, 400)
})
