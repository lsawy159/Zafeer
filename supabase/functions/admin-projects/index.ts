import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-action',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
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
  const permissions = Array.isArray(profile.permissions) ? profile.permissions : []
  const canDeleteProjects = isAdmin || permissions.includes('projects.delete')

  if (!canDeleteProjects) {
    return jsonResponse({ error: 'غير مصرّح لك بحذف المشاريع' }, 403)
  }

  const action = req.headers.get('x-action')

  // ──────────────────────────────
  // حذف مشروع واحد
  // ──────────────────────────────
  if (action === 'delete') {
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

  return jsonResponse({ error: 'إجراء غير معروف' }, 400)
})
