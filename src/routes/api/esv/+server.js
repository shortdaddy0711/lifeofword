import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { checkRateLimit, RATE_LIMITS } from "$lib/utils/rateLimit.js";

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
  const ESV_API_KEY = env.ESV_API_KEY;

  if (!ESV_API_KEY) {
    return json({ error: "ESV_API_KEY not configured" }, { status: 500 });
  }

  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    return json(
      {
        error: "Rate limit exceeded",
        limits: RATE_LIMITS,
        counts: rateCheck.counts,
      },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      },
    );
  }

  try {
    const query = url.searchParams.toString();
    const esvUrl = `https://api.esv.org/v3/passage/text/?${query}`;

    const response = await fetch(esvUrl, {
      headers: { Authorization: `Token ${ESV_API_KEY}` },
    });

    const data = await response.json();
    return json(data, { status: response.status });
  } catch (err) {
    console.error("ESV API error:", err);
    return json({ error: "Failed to reach ESV API" }, { status: 502 });
  }
}
