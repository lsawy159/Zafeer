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
    .select("permissions")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return false;
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
    .select("id", { count: "exact", head: true })
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

  // Log activity
  const { error: logError } = await supabaseAdmin
    .from("activity_log")
    .insert({
      user_id: req.userId,
      entity_type: "extract",
      entity_id: extractId,
      action: "delete",
      details: { project_id: extract.project_id },
    });

  if (logError) {
    console.error("Failed to log activity:", logError);
    // Don't fail the response, just log the error
  }

  res.status(200).json({ success: true });
});

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

  res.status(501).json({ error: "Not implemented in foundational phase" });
});

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

  res.status(501).json({ error: "Not implemented in foundational phase" });
});

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

  res.status(501).json({ error: "Not implemented in foundational phase" });
});

export default router;
