import { type Request, type Response, type NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // admin role is assigned directly via Supabase Dashboard or seed-admin script — never via API
  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  req.userId = user.id;
  req.userRole = profile.role;
  next();
}
