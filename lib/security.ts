/**
 * Security Module — Rate Limiting, Threat Detection, IP Blocking
 * Cyber Security Agent with 40 years of experience mentality
 */

// ─── IN-MEMORY RATE LIMITER ───
interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const securityEvents: SecurityEvent[] = [];
const blockedIPs = new Set<string>();

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: "rate_limit" | "brute_force" | "suspicious_request" | "blocked_ip" | "xss_attempt" | "sql_injection" | "path_traversal" | "scan_detected";
  ip: string;
  path: string;
  userAgent?: string;
  details: string;
  severity: "low" | "medium" | "high" | "critical";
}

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.firstRequest > 300000) { // 5 min window
      rateLimitStore.delete(key);
    }
  }
  // Keep only last 1000 security events
  if (securityEvents.length > 1000) {
    securityEvents.splice(0, securityEvents.length - 1000);
  }
}, 300000);

/**
 * Rate limit check — returns true if request should be BLOCKED
 */
export function checkRateLimit(
  ip: string,
  path: string,
  opts: { maxRequests?: number; windowMs?: number; blockDurationMs?: number } = {}
): { blocked: boolean; remaining: number; retryAfter?: number } {
  const { maxRequests = 60, windowMs = 60000, blockDurationMs = 300000 } = opts;
  const key = `${ip}:${path}`;
  const now = Date.now();

  // Check if IP is permanently blocked
  if (blockedIPs.has(ip)) {
    return { blocked: true, remaining: 0, retryAfter: 9999 };
  }

  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = { count: 1, firstRequest: now, blocked: false };
    rateLimitStore.set(key, entry);
    return { blocked: false, remaining: maxRequests - 1 };
  }

  // Check if block has expired
  if (entry.blocked && entry.blockedUntil && now > entry.blockedUntil) {
    entry.blocked = false;
    entry.count = 1;
    entry.firstRequest = now;
    return { blocked: false, remaining: maxRequests - 1 };
  }

  // If currently blocked
  if (entry.blocked) {
    const retryAfter = Math.ceil(((entry.blockedUntil || now + blockDurationMs) - now) / 1000);
    return { blocked: true, remaining: 0, retryAfter };
  }

  // Check if window has expired
  if (now - entry.firstRequest > windowMs) {
    entry.count = 1;
    entry.firstRequest = now;
    return { blocked: false, remaining: maxRequests - 1 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    entry.blocked = true;
    entry.blockedUntil = now + blockDurationMs;

    logSecurityEvent({
      type: "rate_limit",
      ip,
      path,
      details: `Rate limit exceeded: ${entry.count} requests in ${windowMs / 1000}s (limit: ${maxRequests})`,
      severity: entry.count > maxRequests * 3 ? "high" : "medium",
    });

    const retryAfter = Math.ceil(blockDurationMs / 1000);
    return { blocked: true, remaining: 0, retryAfter };
  }

  return { blocked: false, remaining: maxRequests - entry.count };
}

/**
 * Login-specific rate limiting (stricter)
 */
export function checkLoginRateLimit(ip: string): { blocked: boolean; attemptsLeft: number } {
  const key = `login:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { count: 1, firstRequest: now, blocked: false };
    rateLimitStore.set(key, entry);
    return { blocked: false, attemptsLeft: 4 };
  }

  // Reset after 15 minutes
  if (now - entry.firstRequest > 900000) {
    entry.count = 1;
    entry.firstRequest = now;
    entry.blocked = false;
    return { blocked: false, attemptsLeft: 4 };
  }

  // Unblock after 30 minutes
  if (entry.blocked && entry.blockedUntil && now > entry.blockedUntil) {
    entry.blocked = false;
    entry.count = 1;
    entry.firstRequest = now;
    return { blocked: false, attemptsLeft: 4 };
  }

  if (entry.blocked) {
    return { blocked: true, attemptsLeft: 0 };
  }

  entry.count++;

  if (entry.count > 5) {
    entry.blocked = true;
    entry.blockedUntil = now + 1800000; // Block 30 min

    logSecurityEvent({
      type: "brute_force",
      ip,
      path: "/login",
      details: `Brute force detected: ${entry.count} failed login attempts. IP blocked for 30 minutes.`,
      severity: "high",
    });

    return { blocked: true, attemptsLeft: 0 };
  }

  return { blocked: false, attemptsLeft: 5 - entry.count };
}

/**
 * Detect suspicious patterns in requests
 */
export function detectThreats(request: { path: string; query?: string; body?: string; headers?: Record<string, string>; ip: string }): string[] {
  const threats: string[] = [];
  const fullUrl = request.path + (request.query || "");

  // SQL Injection patterns
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|alter|create|exec|execute)\b.*\b(from|into|table|database|schema)\b)/i,
    /('|"|;).*(-{2}|\/\*|\*\/)/,
    /\b(or|and)\b\s+\d+\s*=\s*\d+/i,
    /\b(or|and)\b\s+'[^']*'\s*=\s*'[^']*'/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(fullUrl)) {
      threats.push("sql_injection");
      logSecurityEvent({
        type: "sql_injection",
        ip: request.ip,
        path: request.path,
        details: `SQL injection attempt detected in URL: ${fullUrl.slice(0, 200)}`,
        severity: "critical",
      });
      break;
    }
  }

  // XSS patterns
  const xssPatterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /on(error|load|click|mouseover|focus)\s*=/i,
    /<iframe/i,
    /<object/i,
    /eval\s*\(/i,
    /document\.(cookie|domain|write)/i,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(fullUrl) || (request.body && pattern.test(request.body))) {
      threats.push("xss_attempt");
      logSecurityEvent({
        type: "xss_attempt",
        ip: request.ip,
        path: request.path,
        details: `XSS attempt detected: ${fullUrl.slice(0, 200)}`,
        severity: "high",
      });
      break;
    }
  }

  // Path traversal
  const pathTraversalPatterns = [
    /\.\.\//,
    /\.\.\\/, 
    /%2e%2e/i,
    /etc\/passwd/i,
    /proc\/self/i,
    /windows\/system32/i,
  ];

  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(fullUrl)) {
      threats.push("path_traversal");
      logSecurityEvent({
        type: "path_traversal",
        ip: request.ip,
        path: request.path,
        details: `Path traversal attempt: ${fullUrl.slice(0, 200)}`,
        severity: "high",
      });
      break;
    }
  }

  // Scanner detection (common vuln scanner paths)
  const scannerPaths = [
    /wp-admin/i, /wp-login/i, /xmlrpc\.php/i, /wp-content/i,
    /phpmyadmin/i, /\.env$/i, /\.git\//i, /\.htaccess/i,
    /actuator/i, /swagger/i, /debug/i, /trace/i,
    /admin\.php/i, /shell\.php/i, /cmd\.php/i,
    /\.asp$/i, /\.jsp$/i, /cgi-bin/i,
  ];

  for (const pattern of scannerPaths) {
    if (pattern.test(request.path)) {
      threats.push("scan_detected");
      logSecurityEvent({
        type: "scan_detected",
        ip: request.ip,
        path: request.path,
        details: `Vulnerability scanner detected probing: ${request.path}`,
        severity: "medium",
      });
      break;
    }
  }

  return threats;
}

/**
 * Log a security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, "id" | "timestamp" | "userAgent">) {
  securityEvents.push({
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
  });
}

/**
 * Get security events (for dashboard)
 */
export function getSecurityEvents(opts: { limit?: number; severity?: string; type?: string } = {}): SecurityEvent[] {
  let events = [...securityEvents].reverse();

  if (opts.severity) {
    events = events.filter((e) => e.severity === opts.severity);
  }
  if (opts.type) {
    events = events.filter((e) => e.type === opts.type);
  }

  return events.slice(0, opts.limit || 100);
}

/**
 * Get security stats
 */
export function getSecurityStats() {
  const last24h = new Date(Date.now() - 86400000);
  const recentEvents = securityEvents.filter((e) => e.timestamp >= last24h);

  return {
    totalEvents24h: recentEvents.length,
    criticalEvents: recentEvents.filter((e) => e.severity === "critical").length,
    highEvents: recentEvents.filter((e) => e.severity === "high").length,
    blockedIPs: blockedIPs.size,
    rateLimitedRequests: recentEvents.filter((e) => e.type === "rate_limit").length,
    bruteForceAttempts: recentEvents.filter((e) => e.type === "brute_force").length,
    xssAttempts: recentEvents.filter((e) => e.type === "xss_attempt").length,
    sqlInjectionAttempts: recentEvents.filter((e) => e.type === "sql_injection").length,
    scannerDetections: recentEvents.filter((e) => e.type === "scan_detected").length,
    activeRateLimits: rateLimitStore.size,
    topAttackers: getTopAttackers(recentEvents),
  };
}

function getTopAttackers(events: SecurityEvent[]): { ip: string; count: number; severity: string }[] {
  const ipCounts = new Map<string, { count: number; severity: string }>();
  for (const event of events) {
    const existing = ipCounts.get(event.ip) || { count: 0, severity: "low" };
    existing.count++;
    if (severityLevel(event.severity) > severityLevel(existing.severity)) {
      existing.severity = event.severity;
    }
    ipCounts.set(event.ip, existing);
  }
  return Array.from(ipCounts.entries())
    .map(([ip, data]) => ({ ip, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function severityLevel(s: string): number {
  return { low: 1, medium: 2, high: 3, critical: 4 }[s] || 0;
}

/**
 * Block an IP
 */
export function blockIP(ip: string) {
  blockedIPs.add(ip);
  logSecurityEvent({
    type: "blocked_ip",
    ip,
    path: "*",
    details: `IP permanently blocked by admin`,
    severity: "high",
  });
}

/**
 * Unblock an IP
 */
export function unblockIP(ip: string) {
  blockedIPs.delete(ip);
}

/**
 * Get security headers to add to responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=self, microphone=self, geolocation=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  };
}
