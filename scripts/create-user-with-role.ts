import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const VALID_ROLES = new Set(["user", "admin", "superuser"] as const);
type ValidRole = "user" | "admin" | "superuser";

interface ParsedEnvLine {
	key: string;
	value: string;
}

interface ParsedArgs {
	[key: string]: string | boolean | undefined;
}

interface ProfileRecord {
	id: string;
	email: string;
	display_name: string | null;
}

interface AuthUserLike {
	id: string;
	email?: string | null;
	user_metadata?: Record<string, unknown> | null;
}

function createAdminClient(supabaseUrl: string, serviceRoleKey: string) {
	return createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

type AdminClient = ReturnType<typeof createAdminClient>;

function parseEnvLine(line: string): ParsedEnvLine | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#")) {
		return null;
	}

	const separatorIndex = trimmed.indexOf("=");
	if (separatorIndex <= 0) {
		return null;
	}

	const key = trimmed.slice(0, separatorIndex).trim();
	let value = trimmed.slice(separatorIndex + 1).trim();

	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		value = value.slice(1, -1);
	}

	return { key, value };
}

function loadEnvFile(filename: string): void {
	const filePath = path.join(process.cwd(), filename);
	if (!fs.existsSync(filePath)) {
		return;
	}

	const content = fs.readFileSync(filePath, "utf8");
	for (const line of content.split(/\r?\n/)) {
		const entry = parseEnvLine(line);
		if (!entry) {
			continue;
		}

		if (typeof process.env[entry.key] === "undefined") {
			process.env[entry.key] = entry.value;
		}
	}
}

function parseArgs(argv: string[]): ParsedArgs {
	const args: ParsedArgs = {};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (!token.startsWith("--")) {
			continue;
		}

		const key = token.slice(2);
		const next = argv[index + 1];

		if (!next || next.startsWith("--")) {
			args[key] = true;
			continue;
		}

		args[key] = next;
		index += 1;
	}

	return args;
}

function printUsageAndExit(): never {
	console.error(
		[
			"Usage:",
			'  pnpm user:create -- --email <email> --password <password> [--role user|admin|superuser] [--display-name "Name"] [--confirm-email true|false]',
			"",
			"Examples:",
			'  pnpm user:create -- --email jane@example.com --password "Str0ngPass!" --role user --display-name "Jane Doe"',
			'  pnpm user:create -- --email admin@example.com --password "Str0ngPass!" --role admin --display-name "Admin One"',
		].join("\n"),
	);
	process.exit(1);
}

function toBoolean(value: string | boolean | undefined, fallback = true): boolean {
	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value !== "string") {
		return fallback;
	}

	const normalized = value.trim().toLowerCase();
	if (["false", "0", "no", "off"].includes(normalized)) return false;
	if (["true", "1", "yes", "on"].includes(normalized)) return true;
	return fallback;
}

function isValidRole(value: string): value is ValidRole {
	return VALID_ROLES.has(value as ValidRole);
}

async function findAuthUserByEmail(adminClient: AdminClient, email: string): Promise<AuthUserLike | null> {
	let page = 1;
	const perPage = 1000;
	const targetEmail = email.toLowerCase();

	while (true) {
		const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
		if (error) {
			throw new Error(`Could not list auth users: ${error.message}`);
		}

		const match = data.users.find((user) => (user.email || "").toLowerCase() === targetEmail);
		if (match) {
			return {
				id: match.id,
				email: match.email,
				user_metadata: (match.user_metadata as Record<string, unknown> | null) ?? null,
			};
		}

		if (data.users.length < perPage) {
			return null;
		}

		page += 1;
	}
}

async function waitForProfile(
	adminClient: AdminClient,
	userId: string,
	maxAttempts = 20,
	delayMs = 250,
): Promise<ProfileRecord | null> {
	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		const { data, error } = await adminClient
			.from("profiles")
			.select("id, email, display_name")
			.eq("id", userId)
			.maybeSingle<ProfileRecord>();

		if (error) {
			throw new Error(`Could not read profile: ${error.message}`);
		}

		if (data) {
			return data;
		}

		await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
	}

	return null;
}

async function main(): Promise<void> {
	loadEnvFile(".env.local");
	loadEnvFile(".env");

	const args = parseArgs(process.argv.slice(2));
	const email = String(args.email || "")
		.trim()
		.toLowerCase();
	const password = String(args.password || "").trim();
	const roleCandidate = String(args.role || "user")
		.trim()
		.toLowerCase();
	const displayName = String(args["display-name"] || args.displayName || "").trim();
	const confirmEmail = toBoolean(args["confirm-email"], true);

	if (!email || !password) {
		printUsageAndExit();
	}

	if (!isValidRole(roleCandidate)) {
		throw new Error(`Invalid role "${roleCandidate}". Allowed roles: user, admin, superuser.`);
	}

	const role = roleCandidate;
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
	}

	const adminClient = createAdminClient(supabaseUrl, serviceRoleKey);

	const { data: roles, error: rolesError } = await adminClient.from("roles").select("name");
	if (rolesError) {
		throw new Error(`Could not fetch roles: ${rolesError.message}`);
	}

	if (!roles.some((record) => record.name === role)) {
		throw new Error(`Role "${role}" not found in roles table.`);
	}

	let authUser = await findAuthUserByEmail(adminClient, email);
	let action: "created" | "updated" = "updated";

	if (!authUser) {
		const { data, error } = await adminClient.auth.admin.createUser({
			email,
			password,
			email_confirm: confirmEmail,
			user_metadata: {
				display_name: displayName || null,
			},
		});

		if (error || !data.user) {
			throw new Error(`Could not create auth user: ${error?.message || "unknown error"}`);
		}

		authUser = {
			id: data.user.id,
			email: data.user.email,
			user_metadata: (data.user.user_metadata as Record<string, unknown> | null) ?? null,
		};
		action = "created";
	} else {
		const existingDisplayName =
			typeof authUser.user_metadata?.display_name === "string" ? authUser.user_metadata.display_name : null;

		const { error } = await adminClient.auth.admin.updateUserById(authUser.id, {
			password,
			email_confirm: confirmEmail,
			user_metadata: {
				...(authUser.user_metadata || {}),
				display_name: displayName || existingDisplayName || null,
			},
		});

		if (error) {
			throw new Error(`Could not update existing auth user: ${error.message}`);
		}
	}

	let profile = await waitForProfile(adminClient, authUser.id);

	if (!profile) {
		const { error: insertProfileError } = await adminClient.from("profiles").upsert(
			{
				id: authUser.id,
				email,
				display_name: displayName || null,
				status: "active",
			},
			{ onConflict: "id" },
		);

		if (insertProfileError) {
			throw new Error(`Could not upsert profile: ${insertProfileError.message}`);
		}

		profile = await waitForProfile(adminClient, authUser.id, 8, 200);
	}

	if (profile && displayName && profile.display_name !== displayName) {
		const { error: updateProfileError } = await adminClient
			.from("profiles")
			.update({ display_name: displayName })
			.eq("id", authUser.id);

		if (updateProfileError) {
			throw new Error(`Could not update profile display name: ${updateProfileError.message}`);
		}
	}

	const { error: promoteError } = await adminClient.rpc("promote_user_to_role", {
		target_email: email,
		target_role: role,
	});

	if (promoteError) {
		throw new Error(`Could not assign role "${role}": ${promoteError.message}`);
	}

	const { data: assignedRole, error: assignedRoleError } = await adminClient.rpc("user_role", {
		user_id: authUser.id,
	});

	if (assignedRoleError) {
		throw new Error(`Could not read assigned role: ${assignedRoleError.message}`);
	}

	console.log(
		JSON.stringify(
			{
				action,
				user: {
					id: authUser.id,
					email,
					display_name: displayName || profile?.display_name || null,
				},
				role: assignedRole,
				confirm_email: confirmEmail,
			},
			null,
			2,
		),
	);
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exit(1);
});
