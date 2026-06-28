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
    'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
    'Vary': 'Origin',
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

// Password policy (mirrors artifacts/zafeer/src/utils/passwordPolicy.ts DEFAULT_PASSWORD_POLICY).
// Returns the first failing requirement message, or null when the password is valid.
// Inlined (not imported) because this Deno edge function cannot import from the app package.
function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
  if (!/[A-Z]/.test(password)) return 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل (A-Z)'
  if (!/[a-z]/.test(password)) return 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل (a-z)'
  if (!/\d/.test(password)) return 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل (0-9)'
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    return 'يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (!@#$%^&*...)'
  }
  return null
}

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('already registered') ||
    normalized.includes('email_exists') ||
    normalized.includes('already exists')
  ) {
    return 'البريد الإلكتروني مستخدم بالفعل'
  }

  // Length is validated explicitly before calling Supabase Auth, so any password
  // error returned here is a complexity failure — do NOT mislabel it as "too short".
  if (normalized.includes('weak_password') || normalized.includes('password')) {
    return 'كلمة المرور ضعيفة: يجب أن تكون 8 أحرف على الأقل وتشمل حرفاً كبيراً وصغيراً ورقماً ورمزاً'
  }

  return 'حدث خطأ، حاول مجدداً'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidRole(value: unknown): value is 'admin' | 'manager' | 'user' {
  return value === 'admin' || value === 'manager' || value === 'user'
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

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return jsonResponse({ error: 'إجراء غير معروف' }, 400)
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
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin' || profile.is_active !== true) {
    return jsonResponse({ error: 'غير مصرّح لك بهذه العملية' }, 403)
  }

  const action = req.headers.get('x-action')
  if (!action) {
    return jsonResponse({ error: 'إجراء غير معروف' }, 400)
  }

  if (action === 'create') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
    }

    const fullName = body.full_name
    const email = body.email
    const password = body.password
    const role = body.role

    if (!isNonEmptyString(fullName) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
    }

    const createPwError = validatePasswordComplexity(password)
    if (createPwError) {
      return jsonResponse({ error: createPwError }, 400)
    }

    if (!isValidRole(role)) {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
    }

    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })

    // إذا فشل الإنشاء بسبب إيميل مسجَّل مسبقاً، تحقق من وجود صف public.users —
    // لو الصف غائب فالمستخدم Auth يتيم: تبنَّه بدل رفض الطلب.
    if (createError) {
      const normalized = createError.message.toLowerCase()
      const isDuplicate =
        normalized.includes('already registered') ||
        normalized.includes('email_exists') ||
        normalized.includes('already exists')

      if (isDuplicate) {
        // هل يوجد صف public.users لهذا الإيميل؟
        const { data: existingProfile } = await adminClient
          .from('users')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle()

        if (existingProfile) {
          // المستخدم موجود كاملاً — أعد الخطأ الاعتيادي
          return jsonResponse({ error: 'البريد الإلكتروني مستخدم بالفعل' }, 400)
        }

        // لا يوجد صف public.users — المستخدم Auth يتيم؛ ابحث عن معرّفه وأنشئ الصف
        const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const orphanUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
        )

        if (!orphanUser) {
          return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 500)
        }

        // المستخدم Auth يحتفظ بكلمة مروره القديمة المجهولة — اضبطها على ما أدخله المدير
        const { error: pwResetError } = await adminClient.auth.admin.updateUserById(
          orphanUser.id,
          { password, email_confirm: true }
        )
        if (pwResetError) {
          return jsonResponse({ error: mapAuthError(pwResetError.message) }, 400)
        }

        const { data: adoptedProfile, error: adoptError } = await adminClient
          .from('users')
          .insert({
            id: orphanUser.id,
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            role,
            permissions: [],
            is_active: true,
          })
          .select()
          .single()

        if (adoptError || !adoptedProfile) {
          return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 500)
        }

        return jsonResponse({ user: adoptedProfile }, 201)
      }

      return jsonResponse({ error: mapAuthError(createError.message) }, 400)
    }

    if (!authData.user) {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 500)
    }

    const { data: createdProfile, error: insertError } = await adminClient
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.trim(),
        full_name: fullName.trim(),
        role,
        permissions: [],
        is_active: true,
      })
      .select()
      .single()

    if (insertError || !createdProfile) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 500)
    }

    return jsonResponse({ user: createdProfile }, 201)
  }

  if (action === 'update') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
    }

    const id = body.id
    if (!isNonEmptyString(id)) {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
    }

    if (id === user.id && body.role !== undefined) {
      return jsonResponse({ error: 'لا يمكنك تغيير دورك الخاص' }, 400)
    }

    const updates: Record<string, unknown> = {}
    let newEmail: string | undefined

    if (body.full_name !== undefined) {
      if (!isNonEmptyString(body.full_name)) {
        return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
      }
      updates.full_name = body.full_name.trim()
    }

    if (body.role !== undefined) {
      if (!isValidRole(body.role)) {
        return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
      }
      updates.role = body.role
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
      }
      updates.is_active = body.is_active
    }

    if (body.email !== undefined) {
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!isNonEmptyString(body.email) || !EMAIL_RE.test((body.email as string).trim())) {
        return jsonResponse({ error: 'البريد الإلكتروني غير صالح' }, 400)
      }
      newEmail = (body.email as string).trim().toLowerCase()
      updates.email = newEmail
    }

    if (Object.keys(updates).length === 0) {
      return jsonResponse({ error: 'لا توجد بيانات للتحديث' }, 400)
    }

    // تحديث auth.users أولاً إذا تغيّر الإيميل
    if (newEmail) {
      const { error: emailError } = await adminClient.auth.admin.updateUserById(id, {
        email: newEmail,
        email_confirm: true,
      })
      if (emailError) {
        return jsonResponse({ error: mapAuthError(emailError.message) }, 400)
      }
    }

    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updatedUser) {
      // PG 23505 = unique_violation (مثلاً الإيميل مستخدم بالفعل)
      if (updateError?.code === '23505') {
        return jsonResponse({ error: 'البريد الإلكتروني مستخدم بالفعل' }, 400)
      }
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 500)
    }

    return jsonResponse({ user: updatedUser })
  }

  if (action === 'reset-password') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
    }

    const id = body.id
    const password = body.password

    if (!isNonEmptyString(id) || !isNonEmptyString(password)) {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
    }

    const resetPwError = validatePasswordComplexity(password)
    if (resetPwError) {
      return jsonResponse({ error: resetPwError }, 400)
    }

    const { error: resetError } = await adminClient.auth.admin.updateUserById(id, {
      password,
    })

    if (resetError) {
      return jsonResponse({ error: mapAuthError(resetError.message) }, 400)
    }

    return jsonResponse({ success: true })
  }

  if (action === 'delete') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
    }

    const id = body.id
    if (!isNonEmptyString(id)) {
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 400)
    }

    // لا يمكن للمدير حذف حسابه الخاص
    if (id === user.id) {
      return jsonResponse({ error: 'لا يمكنك حذف حسابك الخاص' }, 400)
    }

    // حذف صف public.users (FKs الأخرى كلها SET NULL بعد migration 080)
    const { error: deleteError } = await adminClient
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteError) {
      // 23503 = FK violation (RESTRICT لا يزال موجوداً في جدول ما)
      if (deleteError.code === '23503') {
        return jsonResponse(
          { error: 'لا يمكن حذف المستخدم لأنه مرتبط بسجلات؛ عطّله بدل الحذف' },
          400
        )
      }
      return jsonResponse({ error: 'حدث خطأ، حاول مجدداً' }, 500)
    }

    // حذف مستخدم Auth لمنع الأيتام — الفشل هنا لا يوقف العملية
    await adminClient.auth.admin.deleteUser(id).catch(() => { /* ignore */ })

    return jsonResponse({ success: true })
  }

  return jsonResponse({ error: 'إجراء غير معروف' }, 400)
})
