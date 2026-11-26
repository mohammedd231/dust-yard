// Paddle webhook -> writes car ownership into public.purchases.
// Deploy with verify_jwt = false (Paddle does not send a Supabase JWT).
// Required secrets: PADDLE_WEBHOOK_SECRET  (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically)
import { createClient } from "jsr:@supabase/supabase-js@2";

// Paddle price id -> the product we grant
const PRICE_PRODUCT: Record<string, string> = {
  "pri_01m8bsgt2e30y3cb89tkt39zy0": "car:r34",       // Night Drifts - GT-R
  "pri_01m8bskmqdrkde209d9w56stw5": "car:fortune",   // Night Drifts - RX-7 (VeilSide)
  "pri_01m8bsma2fhfkqz2d8vwvsfs31": "car:eclipse",   // Night Drifts - Eclipse
  "pri_01m8bsncnqpxx1tz2fbyje10dk": "pack:night",    // Night Drifts - 3-Car Pack
};

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Verify Paddle-Signature: "ts=<unix>;h1=<hmac-sha256 of `ts:rawBody`>"
async function verify(sigHeader: string, raw: string, secret: string): Promise<boolean> {
  try {
    const parts: Record<string, string> = {};
    for (const kv of sigHeader.split(";")) { const i = kv.indexOf("="); if (i > 0) parts[kv.slice(0, i)] = kv.slice(i + 1); }
    const ts = parts["ts"], h1 = parts["h1"];
    if (!ts || !h1) return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${raw}`)));
    if (mac.length !== h1.length) return false;
    let diff = 0; for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ h1.charCodeAt(i);
    return diff === 0;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const secret = Deno.env.get("PADDLE_WEBHOOK_SECRET") ?? "";
  const raw = await req.text();
  const sig = req.headers.get("Paddle-Signature") ?? "";
  if (!secret || !(await verify(sig, raw, secret))) return new Response("bad signature", { status: 401 });

  let evt: any; try { evt = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  const type = evt?.event_type;
  // a completed/paid transaction is the point money has actually been taken
  if (type !== "transaction.completed" && type !== "transaction.paid") return new Response("ignored", { status: 200 });

  const data = evt.data ?? {};
  const custom = data.custom_data ?? {};
  const userId = custom.user_id;
  if (!userId) return new Response("no user_id", { status: 200 });

  const products = new Set<string>();
  if (typeof custom.product === "string" && custom.product) products.add(custom.product);
  for (const it of (data.items ?? [])) { const p = PRICE_PRODUCT[it?.price?.id]; if (p) products.add(p); }
  // the pack also grants each individual car, so ownership works however it's checked
  if (products.has("pack:night")) { products.add("car:r34"); products.add("car:fortune"); products.add("car:eclipse"); }
  if (!products.size) return new Response("no products", { status: 200 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const rows = [...products].map((product) => ({ user_id: userId, product, source: "paddle", order_id: data.id ?? null }));
  const { error } = await sb.from("purchases").upsert(rows, { onConflict: "user_id,product" });
  if (error) { console.error("db", error.message); return new Response("db error", { status: 500 }); }
  return new Response("ok", { status: 200 });
});
