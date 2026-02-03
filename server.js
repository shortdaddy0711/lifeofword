const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5500;
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
const requestLog = [];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    ...headers,
  });
  res.end(body);
}

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

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function proxyEsv(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!ESV_API_KEY) {
    sendJson(res, 401, { error: "Missing ESV_API_KEY" });
    return;
  }

  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    sendJson(
      res,
      429,
      {
        error: "Rate limit exceeded",
        limits: RATE_LIMITS,
        counts: rateCheck.counts,
      },
      { "Retry-After": "60" }
    );
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const esvPath = `/v3/passage/text/?${url.searchParams.toString()}`;

  const esvReq = https.request(
    {
      hostname: "api.esv.org",
      path: esvPath,
      method: "GET",
      headers: { Authorization: `Token ${ESV_API_KEY}` },
    },
    (esvRes) => {
      res.writeHead(esvRes.statusCode || 500, {
        "Content-Type": esvRes.headers["content-type"] || "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      esvRes.pipe(res);
    }
  );

  esvReq.on("error", () => {
    sendJson(res, 502, { error: "Failed to reach ESV API" });
  });

  esvReq.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/esv") {
    proxyEsv(req, res);
    return;
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path
    .normalize(requestedPath)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  const filePath = path.join(__dirname, safePath);

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
