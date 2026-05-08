import rateLimit from "express-rate-limit";

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
const max = Number(process.env.RATE_LIMIT_MAX ?? 100);

export const adminRateLimiter = rateLimit({
  windowMs,
  limit: max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "تم تجاوز الحد المسموح من الطلبات. حاول لاحقاً." },
});
