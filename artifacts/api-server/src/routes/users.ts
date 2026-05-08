import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAdmin } from "../middleware/auth.js";
import { adminRateLimiter } from "../middleware/rateLimit.js";

const router = Router();
router.use("/admin", adminRateLimiter);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  role: z.enum(["manager", "user"]).default("user"),
  permissions: z.array(z.string()).default([]),
});

const updateUserSchema = z
  .object({
    full_name: z.string().min(1).optional(),
    role: z.enum(["manager", "user"]).optional(),
    permissions: z.array(z.string()).optional(),
    is_active: z.boolean().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "لا توجد بيانات للتحديث",
  });

// POST /api/admin/users — إنشاء مستخدم جديد
router.post("/admin/users", requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }
  const { email, password, full_name, role, permissions } = parsed.data;

  // إنشاء user في Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    res.status(400).json({ error: authError.message });
    return;
  }

  const userId = authData.user.id;

  // إنشاء profile في public.users
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .insert({
      id: userId,
      email,
      full_name,
      role,
      permissions,
      is_active: true,
    })
    .select()
    .single();

  if (profileError) {
    // rollback: حذف auth user إذا فشل إنشاء profile
    await supabaseAdmin.auth.admin.deleteUser(userId);
    res.status(500).json({ error: profileError.message });
    return;
  }

  res.status(201).json({ user: profile });
});

// GET /api/admin/users — قائمة المستخدمين
router.get("/admin/users", requireAdmin, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, username, full_name, role, permissions, is_active, created_at, last_login")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ users: data });
});

// PATCH /api/admin/users/:id — تعديل مستخدم
router.patch("/admin/users/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }
  const { full_name, role, permissions, is_active, password } = parsed.data;

  // تحديث password إذا وجد
  if (password) {
    const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
    if (pwError) {
      res.status(400).json({ error: pwError.message });
      return;
    }
  }

  const updates: Record<string, unknown> = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (role !== undefined) updates.role = role;
  if (permissions !== undefined) updates.permissions = permissions;
  if (is_active !== undefined) updates.is_active = is_active;

  // updateUserSchema.refine ensures at least one field present — no need to re-check
  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ user: data });
    return;
  }

  res.json({ success: true });
});

// DELETE /api/admin/users/:id — حذف مستخدم
router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ success: true });
});

export default router;
