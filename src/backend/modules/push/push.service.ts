import webpush from "web-push";
import { PushSubscriptionModel, PushSubscriptionRecord } from "./push.model.js";
import { env } from "../../config/env.js";

// Ensure subject is a valid URL or mailto
webpush.setVapidDetails(
  "mailto:soporte@adevsays.com",
  env.vapidPublicKey,
  env.vapidPrivateKey
);

export async function saveSubscription(
  subscription: webpush.PushSubscription,
  cities: string
) {
  const endpoint = subscription.endpoint;
  const keysJson = JSON.stringify(subscription.keys || {});
  
  const existing = await PushSubscriptionModel.findOne<PushSubscriptionRecord>({ where: { endpoint } });
  if (existing) {
    await PushSubscriptionModel.update(existing.id, {
      keys_json: keysJson,
      cities: cities.toLowerCase()
    });
    return existing;
  }

  await PushSubscriptionModel.create({
    endpoint,
    keys_json: keysJson,
    cities: cities.toLowerCase(),
    created_at: new Date().toISOString()
  });
}

export async function notifyUrgentReport(report: {
  priority: string;
  municipality: string | null;
  description: string | null;
}) {
  if (report.priority !== "urgent" && report.priority !== "critical") {
    return;
  }

  const allSubs = await PushSubscriptionModel.findAll<PushSubscriptionRecord>();
  
  const priorityEs = report.priority === "critical" ? "CRÍTICO" : (report.priority === "urgent" ? "URGENTE" : "NECESARIO");

  const payload = JSON.stringify({
    title: `🚨 Reporte ${priorityEs} en ${report.municipality || "Ubicación desconocida"}`,
    body: report.description ? report.description.slice(0, 100) : "Se requiere atención inmediata.",
    url: "/coordinar.html"
  });

  const reportCity = (report.municipality || "").toLowerCase();

  for (const sub of allSubs) {
    const userCities = sub.cities.split(",").map(c => c.trim().toLowerCase());
    const wantsAll = userCities.includes("todas") || userCities.includes("todo") || userCities.includes("all");
    
    if (wantsAll || userCities.includes(reportCity)) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: JSON.parse(sub.keys_json)
        }, payload);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log("Subscription expired or removed", sub.endpoint);
          await PushSubscriptionModel.execute(`DELETE FROM push_subscriptions WHERE id = ?`, [sub.id]);
        } else {
          console.error("Error sending push notification", err);
        }
      }
    }
  }
}
