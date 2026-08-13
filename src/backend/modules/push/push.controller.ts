import type { Request, Response } from "express";
import { saveSubscription } from "./push.service.js";

export async function postNotificationSubscribeHandler(req: Request, res: Response) {
  try {
    const { subscription, cities } = req.body;
    if (!subscription || typeof cities !== "string") {
      res.status(400).json({ error: "Falta subscription o cities en el body" });
      return;
    }
    
    await saveSubscription(subscription, cities);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Push Subscribe Error:", err);
    res.status(500).json({ error: "Error interno", detail: err.message });
  }
}
