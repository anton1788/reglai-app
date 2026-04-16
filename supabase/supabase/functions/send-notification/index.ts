// @ts-nocheck Deno types are provided at runtime by Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@1.0.1";
import { Redis } from "https://esm.sh/@upstash/redis@1.25.1";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
});

serve(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for") || "anon";
  const { success, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: "Too Many Requests",
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});