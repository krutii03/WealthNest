// @deno-types="./deno.d.ts"
declare const Deno: { env: { get(name: string): string | undefined } };

// Import for Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Add type definitions for Deno's crypto API
declare const crypto: {
  getRandomValues: <T extends ArrayBufferView | null>(array: T) => T;
  subtle: {
    digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer>;
  };
};

// Base64 encoding function for Edge Runtime (robust version)
const b64 = (buffer: Uint8Array): string => {
  // build string without using a huge spread which can crash for large buffers
  let str = '';
  for (let i = 0; i < buffer.length; i++) {
    str += String.fromCharCode(buffer[i]);
  }
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(str);
  // Fallback: encode using a simple base64 implementation when btoa isn't available
  // (very unlikely in Edge runtime, but keeps this portable)
  return Buffer.from(buffer).toString('base64');
};

// Define the Request type
type Request = {
  method: string;
  json: () => Promise<any>;
  text: () => Promise<string>;
  headers: Headers;
};

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TW_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TW_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TW_FROM = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
const JWT_SECRET = Deno.env.get('JWT_SECRET') || '';
const NODE_ENV = Deno.env.get('NODE_ENV') || 'development';
const DEMO_OTP = (Deno.env.get("DEMO_OTP") || "").toLowerCase() === "true";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function sha256Base64(s: string) {
  const data = new TextEncoder().encode(s);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return b64(new Uint8Array(hashBuffer));
}

type Body = { purpose: "login"|"buy"|"sell"|"invest"|"redeem"|"withdraw" };

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const auth = authHeader.replace("Bearer ", "");
    const { data: authUser, error: authError } = await supabase.auth.getUser(auth || undefined);

    if (authError || !authUser?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as Body;
    if (!body?.purpose) return new Response("Missing purpose", { status: 400 });

    const { data: u } = await supabase
      .from("users")
      .select("user_id, phone")
      .eq("email", authUser.user.email)
      .maybeSingle();
    if (!u?.user_id || !u.phone) return new Response("No user/phone", { status: 400 });

    // Rate limit: one OTP per 60s
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("otp_log")
      .select("*", { head: true, count: "exact" })
      .eq("user_id", u.user_id)
      .gte("created_at", since);
    const currentCount = Number(count ?? 0);
    if (currentCount > 0) {
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otp_hash = await sha256Base64(code);
    const expires_at = new Date(Date.now() + 2 * 60_000).toISOString();

    const { data: row, error: insErr } = await supabase
      .from("otp_log")
      .insert({ user_id: u.user_id, purpose: body.purpose, otp_hash, expires_at })
      .select()
      .maybeSingle();
    if (insErr || !row) {
      const msg = insErr?.message ?? 'Insert failed';
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    if (DEMO_OTP) {
      return new Response(JSON.stringify({ requestId: row.otp_id, demoCode: code }), {
        headers: { "content-type": "application/json" },
      });
    }

    const twBody = new URLSearchParams({
      To: u.phone,
      From: TW_FROM,
      Body: `WealthNest OTP: ${code}. Valid 2 minutes.`,
    });

    const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + b64(new TextEncoder().encode(`${TW_SID}:${TW_TOKEN}`)),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twBody,
    });

    if (!twRes.ok) return new Response("SMS failed", { status: 502 });

    return new Response(JSON.stringify({ requestId: row.otp_id }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: unknown) {
    console.error("OTP Send Error:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
