/**
 * In-memory sliding-window rate limiter.
 * Resets on server restart (acceptable for light use).
 */

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

function countSince(timestamps, cutoff) {
  let count = 0;
  for (let i = timestamps.length - 1; i >= 0; i -= 1) {
    if (timestamps[i] <= cutoff) break;
    count += 1;
  }
  return count;
}

/**
 * Check if a request is allowed under rate limits.
 * @returns {{ allowed: boolean, counts: { minute: number, hour: number, day: number } }}
 */
export function checkRateLimit() {
  const now = Date.now();

  // Prune entries older than one day
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

export { RATE_LIMITS };
