import { Router } from "express";
import { getReportHistoryHandler, getReportsHandler, patchReportStatusHandler, patchReportLocationHandler, syncReportsHandler } from "./modules/reports/report.controller.js";
import { postNotificationSubscribeHandler } from "./modules/push/push.controller.js";

export function createRoutes() {
  const router = Router();

  router.get("/api/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  router.post("/api/reports/sync", syncReportsHandler);
  router.get("/api/reports", getReportsHandler);
  router.patch("/api/reports/:id/status", patchReportStatusHandler);
  router.patch("/api/reports/:id/location", patchReportLocationHandler);
  router.get("/api/reports/:id/history", getReportHistoryHandler);
  router.post("/api/notifications/subscribe", postNotificationSubscribeHandler);

  return router;
}
