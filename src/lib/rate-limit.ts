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

	await supabase.from(RATE_LIMIT_TABLE).upsert(
		{
			key,
			value: result.nextRecord,
		},
		{ onConflict: "key" },
	);

	return {
		allowed: true,
		retryAfterSeconds: 0,
	};
}
