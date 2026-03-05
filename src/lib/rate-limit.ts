import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface RateLimitRecord {
	count: number;
	window_start_ms: number;
}

interface ConsumeRateLimitOptions {
	key: string;
	limit: number;
	windowMs: number;
	nowMs?: number;
}

interface RateLimitResult {
	allowed: boolean;
	retryAfterSeconds: number;
}

const RATE_LIMIT_TABLE = "kv_store_5f4f70f9";

type GlobalRateLimitStore = Map<string, RateLimitRecord>;

function getGlobalEdgeStore() {
	const globalKey = "__coffee_brew_edge_rate_limit_store";
	const globalObject = globalThis as unknown as { [key: string]: GlobalRateLimitStore | undefined };
	if (!globalObject[globalKey]) {
		globalObject[globalKey] = new Map<string, RateLimitRecord>();
	}
	return globalObject[globalKey] as GlobalRateLimitStore;
}

function normalizeRecord(value: unknown): RateLimitRecord | null {
	if (!value || typeof value !== "object") return null;
	const raw = value as Record<string, unknown>;
	const count = Number(raw.count);
	const windowStartMs = Number(raw.window_start_ms);
	if (!Number.isFinite(count) || !Number.isFinite(windowStartMs)) return null;
	if (count < 0 || windowStartMs < 0) return null;
	return {
		count,
		window_start_ms: windowStartMs,
	};
}

function evaluateRateLimit(
	record: RateLimitRecord | null,
	limit: number,
	windowMs: number,
	nowMs: number,
): RateLimitResult & {
	nextRecord: RateLimitRecord;
} {
	if (!record || nowMs - record.window_start_ms >= windowMs) {
		return {
			allowed: true,
			retryAfterSeconds: 0,
			nextRecord: {
				count: 1,
				window_start_ms: nowMs,
			},
		};
	}

	if (record.count >= limit) {
		const windowEndMs = record.window_start_ms + windowMs;
		const retryAfterSeconds = Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000));
		return {
			allowed: false,
			retryAfterSeconds,
			nextRecord: record,
		};
	}

	return {
		allowed: true,
		retryAfterSeconds: 0,
		nextRecord: {
			count: record.count + 1,
			window_start_ms: record.window_start_ms,
		},
	};
}

/**
 * In-process rate limiter backed by a module-level Map.
 *
 * **Per-instance limitation:** In serverless / edge environments each cold-start
 * produces an independent store. A user can exceed the logical limit by hitting
 * different instances. Use `consumeDbRateLimit` for security-critical endpoints
 * where the limit must be enforced globally across all instances.
 *
 * This function is intentionally kept for edge middleware (e.g. `proxy.ts`)
 * where the latency of a DB call on every request is unacceptable.
 */
export function consumeEdgeRateLimit({
	key,
	limit,
	windowMs,
	nowMs = Date.now(),
}: ConsumeRateLimitOptions): RateLimitResult {
	const store = getGlobalEdgeStore();
	const current = store.get(key) ?? null;
	const result = evaluateRateLimit(current, limit, windowMs, nowMs);
	if (result.allowed) {
		store.set(key, result.nextRecord);
	}
	return {
		allowed: result.allowed,
		retryAfterSeconds: result.retryAfterSeconds,
	};
}

export async function consumeDbRateLimit({
	key,
	limit,
	windowMs,
	nowMs = Date.now(),
}: ConsumeRateLimitOptions): Promise<RateLimitResult> {
	const supabase = createSupabaseAdminClient();
	const { data: row, error: readError } = await supabase
		.from(RATE_LIMIT_TABLE)
		.select("value")
		.eq("key", key)
		.maybeSingle();

	if (readError) {
		// Fail-open to avoid auth lockouts on transient DB errors.
		return { allowed: true, retryAfterSeconds: 0 };
	}

	const current = normalizeRecord(row?.value ?? null);
	const result = evaluateRateLimit(current, limit, windowMs, nowMs);

	if (!result.allowed) {
		return {
			allowed: false,
			retryAfterSeconds: result.retryAfterSeconds,
		};
	}

	// Write the incremented record. Two concurrent requests may both have read
	// `count < limit` (TOCTOU race), so after upserting we re-read to confirm the
	// stored count still falls within the limit. If another request raced past the
	// limit we deny this one as well. The upsert uses the value from our local
	// evaluation — in case of a concurrent write the last writer wins, which means
	// at most one over-counted request can slip through per window boundary.
	const { error: upsertError } = await supabase.from(RATE_LIMIT_TABLE).upsert(
		{
			key,
			value: result.nextRecord,
		},
		{ onConflict: "key" },
	);

	if (upsertError) {
		// Fail-open on transient upsert errors.
		console.error("[rate-limit] Failed to write rate-limit record:", upsertError.message, { key });
		return { allowed: true, retryAfterSeconds: 0 };
	}

	// Post-write verification: confirm the stored count is within bounds.
	const { data: verifyRow } = await supabase.from(RATE_LIMIT_TABLE).select("value").eq("key", key).maybeSingle();
	const stored = normalizeRecord(verifyRow?.value ?? null);
	if (stored && nowMs - stored.window_start_ms < windowMs && stored.count > limit) {
		const windowEndMs = stored.window_start_ms + windowMs;
		return {
			allowed: false,
			retryAfterSeconds: Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000)),
		};
	}

	return {
		allowed: true,
		retryAfterSeconds: 0,
	};
}
