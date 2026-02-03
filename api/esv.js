const https = require("https");

const ESV_API_KEY = process.env.ESV_API_KEY;

const RATE_LIMITS = {
  perMinute: 60,
  perHour: 1000,
  perDay: 5000,
};

const RATE_WINDOWS_MS = {
  perMinute: 60 * 1000,
  perHour: 60 * 60 * 1000,
  perDay: 24 * 60 * 60 * 1000,
};

// In-memory rate limiting (resets on cold start, but good enough for light use)
const requestLog = [];

function countSince(timestamps, cutoff) {
  let count = 0;
  for (let i = timestamps.length - 1; i >= 0; i -= 1) {
    if (timestamps[i] <= cutoff) {
      break;
    }
    count += 1;
  }
  return count;
}

function checkRateLimit() {
  const now = Date.now();
  while (requestLog.length && requestLog[0] <= now - RATE_WINDOWS_MS.perDay) {
    requestLog.shift();
  }

  const minuteCount = countSince(requestLog, now - RATE_WINDOWS_MS.perMinute);
  const hourCount = countSince(requestLog, now - RATE_WINDOWS_MS.perHour);
  const dayCount = requestLog.length;

  if (
    minuteCount >= RATE_LIMITS.perMinute ||
    hourCount >= RATE_LIMITS.perHour ||
    dayCount >= RATE_LIMITS.perDay
  ) {
    return {
      allowed: false,
      counts: { minute: minuteCount, hour: hourCount, day: dayCount },
    };
  }

  requestLog.push(now);
  return {
    allowed: true,
    counts: { minute: minuteCount, hour: hourCount, day: dayCount },
  };
}

function fetchEsv(query) {
  return new Promise((resolve, reject) => {
    const url = new URL("https://api.esv.org/v3/passage/text/");
    url.search = query;

    const req = https.request(
      url,
      {
        method: "GET",
        headers: { Authorization: `Token ${ESV_API_KEY}` },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode, body: data });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!ESV_API_KEY) {
    res.status(500).json({ error: "ESV_API_KEY not configured" });
    return;
  }

  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({
      error: "Rate limit exceeded",
      limits: RATE_LIMITS,
      counts: rateCheck.counts,
    });
    return;
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const result = await fetchEsv(url.search);

    res.status(result.statusCode);
    res.setHeader("Content-Type", "application/json");
    res.end(result.body);
  } catch (err) {
    console.error("ESV API error:", err);
    res.status(502).json({ error: "Failed to reach ESV API" });
  }
};
