/**
 * ينشئ أول مستخدم admin في Supabase.
 * شغّل مرة واحدة عند إعداد المشروع:
 *   node --env-file=.env ./dist/scripts/seed-admin.mjs
 *   أو: npx tsx src/scripts/seed-admin.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const full_name = process.env.ADMIN_FULL_NAME ?? "مدير النظام";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان");
  process.exit(1);
}
if (!email || !password) {
  console.error("ADMIN_EMAIL و ADMIN_PASSWORD مطلوبان");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ADMIN_PASSWORD يجب أن يكون 8 أحرف على الأقل");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (authError) {
  console.error("فشل إنشاء Auth user:", authError.message);
  process.exit(1);
}

const userId = authData.user.id;

const { error: profileError } = await supabase
  .from("users")
  .insert({ id: userId, email, full_name, role: "admin", permissions: [], is_active: true });

if (profileError) {
  await supabase.auth.admin.deleteUser(userId);
  console.error("فشل إنشاء profile — تم rollback:", profileError.message);
  process.exit(1);
}

console.log(`✅ تم إنشاء admin: ${email} (id: ${userId})`);
