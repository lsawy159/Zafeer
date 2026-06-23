import { Router } from "express";
import {
  AddAdminExtractLineBody,
  AddAdminExtractLineParams,
  DeleteAdminExtractLineParams,
  DeleteAdminExtractParams,
  DeleteAdminProjectParams,
  UpdateAdminExtractLineBody,
  UpdateAdminExtractLineParams,
} from "@workspace/api-zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";
import { adminRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.use("/admin", adminRateLimiter);

async function userHasPermission(userId: string, permission: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("permissions, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  // Admin role has all permissions (mirrors RLS user_has_permission function)
  if (data.role === "admin") {
    return true;
  }

  const permissions = data.permissions;
  if (Array.isArray(permissions)) {
    return permissions.includes(permission);
  }

  if (permissions && typeof permissions === "object") {
    const value = (permissions as Record<string, unknown>)[permission];
    return value === true;
  }

  return false;
}

// DELETE /admin/projects/:id — soft delete a project
// LOCAL ONLY — production uses Edge Function admin-projects (spec 060)
router.delete("/admin/projects/:id", requireAdmin, async (req: AuthRequest, res) => {
  const parsed = DeleteAdminProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  if (!req.userId || !(await userHasPermission(req.userId, "projects.delete"))) {
    res.status(403).json({ error: "Admin access or projects.delete permission required" });
    return;
  }

  const projectId = parsed.data.id;

  // Check if project exists
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Check for active employees
  const { data: activeEmployees, error: empError } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("project_id", projectId)
    .is("is_deleted", null)
    .or("is_deleted.eq.false");

  if (empError) {
    res.status(500).json({ error: "Failed to check active employees" });
    return;
  }

  if (activeEmployees && activeEmployees.length > 0) {
    res.status(409).json({ error: "Cannot delete project with active employees" });
    return;
  }

  // Soft delete project
  const { error: deleteError } = await supabaseAdmin
    .from("projects")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (deleteError) {
    res.status(500).json({ error: "Failed to delete project" });
    return;
  }

  // Log activity
  const { error: logError } = await supabaseAdmin
    .from("activity_log")
    .insert({
      user_id: req.userId,
      entity_type: "project",
      entity_id: projectId,
      action: "delete",
      details: { soft_delete: true },
    });

  if (logError) {
    console.error("Failed to log activity:", logError);
    // Don't fail the response, just log the error
  }

  res.status(200).json({ success: true });
});

// DELETE /admin/extracts/:id — delete extract invoice (cascade to lines)
// LOCAL ONLY — production uses Edge Function admin-projects (spec 060)
router.delete("/admin/extracts/:id", requireAdmin, async (req: AuthRequest, res) => {
  const parsed = DeleteAdminExtractParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  if (!req.userId || !(await userHasPermission(req.userId, "extracts.delete"))) {
    res.status(403).json({ error: "Admin access or extracts.delete permission required" });
    return;
  }

  const extractId = parsed.data.id;

  // Check if extract exists
  const { data: extract, error: extractError } = await supabaseAdmin
    .from("extract_invoices")
    .select("id, project_id")
    .eq("id", extractId)
    .maybeSingle();

  if (extractError || !extract) {
    res.status(404).json({ error: "Extract not found" });
    return;
  }

  // Delete extract (cascade will handle extract_invoice_lines)
  const { error: deleteError } = await supabaseAdmin
    .from("extract_invoices")
    .delete()
    .eq("id", extractId);

  if (deleteError) {
    res.status(500).json({ error: "Failed to delete extract" });
    return;
  }

  // ملاحظة: تسجيل النشاط (action='حذف مستخلص' بتفاصيل غنية) يتم في الفرونت
  // داخل useDeleteExtract.onSuccess. كان هنا تسجيل مكرر بـ action='delete'
  // (يظهر خطأً كـ "إنشاء" في العارض) — أُزيل لمنع كرتين لنفس الحذف.

  res.status(200).json({ success: true });
});

// POST /admin/extracts/:id/lines — add extract line (returns created row, HTTP 201)
// LOCAL ONLY — production uses Edge Function admin-projects (spec 060)
router.post("/admin/extracts/:id/lines", requireAdmin, async (req: AuthRequest, res) => {
  const parsedParams = AddAdminExtractLineParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.format() });
    return;
  }

  const parsedBody = AddAdminExtractLineBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.format() });
    return;
  }

  if (!req.userId || !(await userHasPermission(req.userId, "extracts.edit"))) {
    res.status(403).json({ error: "Admin access or extracts.edit permission required" });
    return;
  }

  const extractId = parsedParams.data.id;
  const { employeeId, attendanceDays } = parsedBody.data;

  // Get extract and validate
  const { data: extract, error: extractError } = await supabaseAdmin
    .from("extract_invoices")
    .select("id, project_id, total_days_in_month")
    .eq("id", extractId)
    .maybeSingle();

  if (extractError || !extract) {
    res.status(404).json({ error: "Extract not found" });
    return;
  }

  // Get employee data for snapshot
  const { data: employee, error: empError } = await supabaseAdmin
    .from("employees")
    .select("id, name, profession, residence_number")
    .eq("id", employeeId)
    .maybeSingle();

  if (empError || !employee) {
    res.status(400).json({ error: "Employee not found" });
    return;
  }

  const profession = employee.profession?.trim() ?? "";
  if (!profession) {
    res.status(400).json({ error: "Employee has no profession" });
    return;
  }

  // Get monthly rate for the profession in this project
  const { data: rateRow, error: rateError } = await supabaseAdmin
    .from("project_job_title_rates")
    .select("monthly_rate")
    .eq("project_id", extract.project_id)
    .ilike("profession", profession)
    .maybeSingle();

  if (rateError || !rateRow) {
    res
      .status(400)
      .json({ error: `No rate found for profession "${profession}" in this project` });
    return;
  }

  const monthlyRate = Number(rateRow.monthly_rate);
  // Calculate amount: (monthlyRate / totalDaysInMonth) * attendanceDays
  const amount = (monthlyRate / extract.total_days_in_month) * attendanceDays;

  // Insert extract line
  const { data: newLine, error: insertError } = await supabaseAdmin
    .from("extract_invoice_lines")
    .insert({
      invoice_id: extractId,
      employee_id: employee.id,
      employee_name_snapshot: employee.name,
      residence_number_snapshot: employee.residence_number ?? 0,
      profession_snapshot: profession,
      monthly_rate_snapshot: monthlyRate,
      attendance_days: attendanceDays,
      total_days_in_month: extract.total_days_in_month,
      amount,
    })
    .select();

  if (insertError || !newLine || newLine.length === 0) {
    res.status(500).json({ error: "Failed to insert extract line" });
    return;
  }

  // Recalculate extract totals
  const { error: recalcError } = await supabaseAdmin.rpc(
    "recalculate_extract_totals",
    { p_invoice_id: extractId }
  );

  if (recalcError) {
    console.error("Failed to recalculate totals:", recalcError);
    // Don't fail the response, just log
  }

  // Log activity
  const { error: logError } = await supabaseAdmin
    .from("activity_log")
    .insert({
      user_id: req.userId,
      entity_type: "extract_line",
      entity_id: newLine[0].id,
      action: "create",
      details: {
        extract_id: extractId,
        employee_id: employee.id,
        amount,
      },
    });

  if (logError) {
    console.error("Failed to log activity:", logError);
  }

  res.status(201).json(newLine[0]);
});

// PATCH /admin/extract-lines/:lineId — update attendance days / rate on extract line
// LOCAL ONLY — production uses Edge Function admin-projects (spec 060)
router.patch("/admin/extract-lines/:lineId", requireAdmin, async (req: AuthRequest, res) => {
  const parsedParams = UpdateAdminExtractLineParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.format() });
    return;
  }

  const parsedBody = UpdateAdminExtractLineBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.format() });
    return;
  }

  if (!req.userId || !(await userHasPermission(req.userId, "extracts.edit"))) {
    res.status(403).json({ error: "Admin access or extracts.edit permission required" });
    return;
  }

  const lineId = parsedParams.data.lineId;
  const { attendanceDays, totalDaysInMonth, monthlyRate } = parsedBody.data;

  // Get extract line to find invoice_id
  const { data: line, error: lineError } = await supabaseAdmin
    .from("extract_invoice_lines")
    .select("id, invoice_id")
    .eq("id", lineId)
    .maybeSingle();

  if (lineError || !line) {
    res.status(404).json({ error: "Extract line not found" });
    return;
  }

  // Calculate new amount
  const amount = (monthlyRate / totalDaysInMonth) * attendanceDays;

  // Update line
  const { error: updateError } = await supabaseAdmin
    .from("extract_invoice_lines")
    .update({
      attendance_days: attendanceDays,
      total_days_in_month: totalDaysInMonth,
      amount,
    })
    .eq("id", lineId);

  if (updateError) {
    res.status(500).json({ error: "Failed to update extract line" });
    return;
  }

  // Recalculate extract totals
  const { error: recalcError } = await supabaseAdmin.rpc(
    "recalculate_extract_totals",
    { p_invoice_id: line.invoice_id }
  );

  if (recalcError) {
    console.error("Failed to recalculate totals:", recalcError);
  }

  // Log activity
  const { error: logError } = await supabaseAdmin
    .from("activity_log")
    .insert({
      user_id: req.userId,
      entity_type: "extract_line",
      entity_id: lineId,
      action: "update",
      details: {
        attendance_days: attendanceDays,
        amount,
      },
    });

  if (logError) {
    console.error("Failed to log activity:", logError);
  }

  res.status(200).json({ success: true });
});

// DELETE /admin/extract-lines/:lineId — remove extract line and recalculate totals
// LOCAL ONLY — production uses Edge Function admin-projects (spec 060)
router.delete("/admin/extract-lines/:lineId", requireAdmin, async (req: AuthRequest, res) => {
  const parsed = DeleteAdminExtractLineParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  if (!req.userId || !(await userHasPermission(req.userId, "extracts.edit"))) {
    res.status(403).json({ error: "Admin access or extracts.edit permission required" });
    return;
  }

  const lineId = parsed.data.lineId;

  // Get extract line to find invoice_id
  const { data: line, error: lineError } = await supabaseAdmin
    .from("extract_invoice_lines")
    .select("id, invoice_id")
    .eq("id", lineId)
    .maybeSingle();

  if (lineError || !line) {
    res.status(404).json({ error: "Extract line not found" });
    return;
  }

  // Delete line
  const { error: deleteError } = await supabaseAdmin
    .from("extract_invoice_lines")
    .delete()
    .eq("id", lineId);

  if (deleteError) {
    res.status(500).json({ error: "Failed to delete extract line" });
    return;
  }

  // Recalculate extract totals
  const { error: recalcError } = await supabaseAdmin.rpc(
    "recalculate_extract_totals",
    { p_invoice_id: line.invoice_id }
  );

  if (recalcError) {
    console.error("Failed to recalculate totals:", recalcError);
  }

  // Log activity
  const { error: logError } = await supabaseAdmin
    .from("activity_log")
    .insert({
      user_id: req.userId,
      entity_type: "extract_line",
      entity_id: lineId,
      action: "delete",
      details: {
        invoice_id: line.invoice_id,
      },
    });

  if (logError) {
    console.error("Failed to log activity:", logError);
  }

  res.status(200).json({ success: true });
});

export default router;
