declare const Deno: { env: { get(name: string): string | undefined } };

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as b64 } from "https://deno.land/std@0.221.0/encoding/base64.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("supabase_url")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("supabase_service_role_key")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const DEMO_OTP = (Deno.env.get("DEMO_OTP") ?? "").toLowerCase() === "true";

async function sha256Base64(s: string) {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return b64(new Uint8Array(buf));
}

type Body = { requestId: string | number; code: string };

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const auth = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    const { data: authUser } = await supabase.auth.getUser(auth);
    if (!authUser?.user?.email) return new Response("Unauthorized", { status: 401 });

    const body = (await req.json()) as Body;
    if (!body?.requestId || !body?.code) return new Response("Missing params", { status: 400 });

    const { data: u } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", authUser.user.email)
      .maybeSingle();
    if (!u?.user_id) return new Response("No user", { status: 400 });

    const { data: row } = await supabase
      .from("otp_log")
      .select("*")
      .eq("otp_id", body.requestId)
      .eq("user_id", u.user_id)
      .maybeSingle();

    if (!row) return new Response("Not found", { status: 404 });
    if (row.used) return new Response("Already used", { status: 400 });
    if (new Date(row.expires_at).getTime() < Date.now()) return new Response("Expired", { status: 400 });
    if ((row.attempt_count ?? 0) >= 3) return new Response("Too many attempts", { status: 429 });

    if (DEMO_OTP && body.code === "123456") {
      await supabase.from("otp_log").update({ used: true }).eq("otp_id", row.otp_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }

    const inputHash = await sha256Base64(body.code);
    if (inputHash !== row.otp_hash) {
      await supabase.from("otp_log").update({ attempt_count: (row.attempt_count ?? 0) + 1 }).eq("otp_id", row.otp_id);
      return new Response("Invalid code", { status: 400 });
    }

    await supabase.from("otp_log").update({ used: true }).eq("otp_id", row.otp_id);
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(e?.message ?? "Error", { status: 500 });
  }
});
