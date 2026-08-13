import { createClient } from "@libsql/client";
import { env } from "./src/backend/config/env.js";

async function testConnection() {
  console.log("URL:", env.tursoDatabaseUrl);
  console.log("Token length:", env.tursoAuthToken.length);

  try {
    const client = createClient({
      url: env.tursoDatabaseUrl,
      authToken: env.tursoAuthToken,
    });
    const res = await client.execute("SELECT 1;");
    console.log("Connection successful:", res.rows);
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

testConnection();
