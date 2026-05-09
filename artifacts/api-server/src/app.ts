import express, { type Express } from "express";
import cors from "cors";
import pinoHttpModule from "pino-http";
import type { Options as PinoHttpOptions, HttpLogger } from "pino-http";

// pino-http uses CJS `export =` — not callable via default import under moduleResolution:bundler
const pinoHttp = pinoHttpModule as unknown as (opts: PinoHttpOptions) => HttpLogger;
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const pinoHttpOpts: PinoHttpOptions = {
  logger,
  serializers: {
    req(req: { id: string; method: string; url?: string }) {
      return {
        id: req.id,
        method: req.method,
        url: req.url?.split("?")[0],
      };
    },
    res(res: { statusCode: number }) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
};
app.use(pinoHttp(pinoHttpOpts));

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
