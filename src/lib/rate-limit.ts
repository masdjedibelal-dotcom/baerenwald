const requests = new Map<
  string,
  { count: number; reset: number }
>();

export function checkRateLimit(
  ip: string,
  limit = 5,
  windowMs = 60 * 60 * 1000,
  namespace = "default"
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = `rl_${namespace}_${ip}`;
  const entry = requests.get(key);

  if (!entry || now > entry.reset) {
    requests.set(key, {
      count: 1,
      reset: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
  };
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    requests.forEach((entry, key) => {
      if (now > entry.reset) {
        requests.delete(key);
      }
    });
  }, 60 * 60 * 1000);
}
