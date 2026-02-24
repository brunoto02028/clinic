import { prisma } from "@/lib/db";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
type LogCategory =
  | "AUTH"
  | "SYSTEM"
  | "API"
  | "DATABASE"
  | "SECURITY"
  | "USER_ACTION"
  | "PERFORMANCE"
  | "SCHEDULED";

interface SystemLogInput {
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  source?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
}

interface AuditLogInput {
  userId: string;
  userEmail: string;
  userRole: string;
  userName?: string;
  action: string;
  entity?: string;
  entityId?: string;
  description: string;
  metadata?: any;
  ip?: string;
  userAgent?: string;
  path?: string;
}

// ─── System Log ────────────────────────────────────────

export async function logSystem(input: SystemLogInput) {
  try {
    await prisma.systemLog.create({
      data: {
        level: input.level,
        category: input.category,
        message: input.message,
        details: input.details ?? undefined,
        source: input.source,
        method: input.method,
        path: input.path,
        statusCode: input.statusCode,
        duration: input.duration,
        userId: input.userId,
        userEmail: input.userEmail,
        userRole: input.userRole,
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
  } catch (err) {
    // Fallback to console if DB is unavailable
    console.error("[SystemLog DB Write Failed]", input.message, err);
  }
}

// Convenience shortcuts
export const sysLog = {
  info: (message: string, opts?: Partial<SystemLogInput>) =>
    logSystem({ level: "INFO", category: "SYSTEM", message, ...opts }),
  warn: (message: string, opts?: Partial<SystemLogInput>) =>
    logSystem({ level: "WARN", category: "SYSTEM", message, ...opts }),
  error: (message: string, opts?: Partial<SystemLogInput>) =>
    logSystem({ level: "ERROR", category: "SYSTEM", message, ...opts }),
  critical: (message: string, opts?: Partial<SystemLogInput>) =>
    logSystem({ level: "CRITICAL", category: "SYSTEM", message, ...opts }),
  auth: (message: string, opts?: Partial<SystemLogInput>) =>
    logSystem({ level: "INFO", category: "AUTH", message, ...opts }),
  security: (message: string, opts?: Partial<SystemLogInput>) =>
    logSystem({ level: "WARN", category: "SECURITY", message, ...opts }),
  api: (message: string, opts?: Partial<SystemLogInput>) =>
    logSystem({ level: "ERROR", category: "API", message, ...opts }),
  db: (message: string, opts?: Partial<SystemLogInput>) =>
    logSystem({ level: "ERROR", category: "DATABASE", message, ...opts }),
  perf: (message: string, opts?: Partial<SystemLogInput>) =>
    logSystem({ level: "WARN", category: "PERFORMANCE", message, ...opts }),
};

// ─── Audit Log ─────────────────────────────────────────

export async function logAudit(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        userRole: input.userRole,
        userName: input.userName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        description: input.description,
        metadata: input.metadata ?? undefined,
        ip: input.ip,
        userAgent: input.userAgent,
        path: input.path,
      },
    });
  } catch (err) {
    console.error("[AuditLog DB Write Failed]", input.description, err);
  }
}

// ─── Request helpers ───────────────────────────────────

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export function getUserAgent(req: Request): string {
  return req.headers.get("user-agent") || "unknown";
}

// ─── Health Check State ────────────────────────────────

let lastHealthStatus: "healthy" | "unhealthy" = "healthy";
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_ALERT = 3;

export function getHealthState() {
  return { status: lastHealthStatus, consecutiveFailures };
}

export function updateHealthState(healthy: boolean) {
  if (healthy) {
    if (lastHealthStatus === "unhealthy") {
      // Server recovered
      sysLog.info("Server recovered — health check passing again", {
        category: "SCHEDULED",
        source: "health-check",
        details: { previousFailures: consecutiveFailures },
      });
    }
    lastHealthStatus = "healthy";
    consecutiveFailures = 0;
  } else {
    consecutiveFailures++;
    lastHealthStatus = "unhealthy";
    if (consecutiveFailures === MAX_FAILURES_BEFORE_ALERT) {
      sysLog.critical(
        `Server unhealthy — ${consecutiveFailures} consecutive health check failures`,
        {
          category: "SCHEDULED",
          source: "health-check",
        }
      );
    }
  }
}

// ─── Failed login tracking (brute-force detection) ────

const loginAttempts = new Map<string, { count: number; firstAt: number }>();
const BRUTE_FORCE_WINDOW = 15 * 60 * 1000; // 15 min
const BRUTE_FORCE_THRESHOLD = 10;

export function trackFailedLogin(email: string, ip: string) {
  const key = `${email}:${ip}`;
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now - entry.firstAt > BRUTE_FORCE_WINDOW) {
    loginAttempts.set(key, { count: 1, firstAt: now });
    return false;
  }

  entry.count++;
  if (entry.count >= BRUTE_FORCE_THRESHOLD) {
    sysLog.security(
      `Possible brute-force attack: ${entry.count} failed login attempts for ${email} from ${ip} in 15min`,
      {
        details: { email, ip, attempts: entry.count },
        source: "auth",
      }
    );
    loginAttempts.delete(key);
    return true;
  }
  return false;
}

// Clean up stale entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of loginAttempts) {
      if (now - val.firstAt > BRUTE_FORCE_WINDOW) loginAttempts.delete(key);
    }
  }, 5 * 60 * 1000);
}
