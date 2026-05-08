import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  logger.fatal("ALLOWED_ORIGINS is empty in production — refusing to start (set ALLOWED_ORIGINS env var)");
  throw new Error("ALLOWED_ORIGINS must be set in production");
}
app.use(
  cors({
    origin: process.env.NODE_ENV === "development" ? true : allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
