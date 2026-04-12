import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

/**
 * NKRV Bible API proxy.
 * Forwards requests to the bible-agent backend and returns verse data.
 *
 * Query params forwarded: book, chapter_start, chapter_end
 *
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url }) {
  const NKRV_API_URL = env.NKRV_API_URL || "http://localhost:8080";

  const params = url.searchParams.toString();
  const apiUrl = `${NKRV_API_URL}/api/bible/chapters?${params}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const text = await response.text();
      console.error(`NKRV API upstream error (${response.status}):`, text);
      return json(
        { error: `NKRV API error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return json(data, { status: 200 });
  } catch (err) {
    console.error("NKRV API proxy error:", err);
    return json({ error: "Failed to reach NKRV API" }, { status: 502 });
  }
}
