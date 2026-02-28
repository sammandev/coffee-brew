import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Action = "list" | "push";

interface EnvEntry {
	key: string;
	value: string;
}

function parseEnvLine(line: string): EnvEntry | null {
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

function resolveSupabaseVersion() {
	try {
		const packageJsonPath = path.join(process.cwd(), "package.json");
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
		};
		const raw = packageJson.devDependencies?.supabase ?? packageJson.dependencies?.supabase ?? "latest";
		const normalized = raw.replace(/^[~^><= ]+/, "").trim();
		return normalized.length > 0 ? normalized : "latest";
	} catch {
		return "latest";
	}
}

function splitArguments(extraArgs: string[]) {
	const globalFlagsWithValue = new Set(["--output", "-o", "--profile", "--dns-resolver", "--network-id", "--workdir"]);
	const globalBooleanFlags = new Set(["--create-ticket", "--debug", "--experimental", "--yes"]);

	const globalArgs: string[] = [];
	const commandArgs: string[] = [];

	for (let index = 0; index < extraArgs.length; index += 1) {
		const arg = extraArgs[index];
		if (!arg) continue;

		if (globalFlagsWithValue.has(arg)) {
			globalArgs.push(arg);
			if (index + 1 < extraArgs.length) {
				const next = extraArgs[index + 1];
				if (next) {
					globalArgs.push(next);
				}
				index += 1;
			}
			continue;
		}

		if (globalBooleanFlags.has(arg)) {
			globalArgs.push(arg);
			continue;
		}

		if (
			arg.startsWith("--output=") ||
			arg.startsWith("--profile=") ||
			arg.startsWith("--dns-resolver=") ||
			arg.startsWith("--network-id=") ||
			arg.startsWith("--workdir=") ||
			arg.startsWith("-o=")
		) {
			globalArgs.push(arg);
			continue;
		}

		commandArgs.push(arg);
	}

	return { commandArgs, globalArgs };
}

function runPnpm(args: string[]): SpawnSyncReturns<string> {
	const windows = process.platform === "win32";
	return spawnSync("pnpm", args, {
		encoding: "utf8",
		shell: windows,
		stdio: "pipe",
	});
}

function emitResult(result: SpawnSyncReturns<string>) {
	if (result.stdout) {
		process.stdout.write(result.stdout);
	}
	if (result.stderr) {
		process.stderr.write(result.stderr);
	}
}

function shouldFallback(result: SpawnSyncReturns<string>) {
	if (result.error) {
		return true;
	}

	const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.toLowerCase();
	return (
		combined.includes("cannot find the path specified") ||
		combined.includes("spawn") ||
		combined.includes("enoent") ||
		combined.includes("einval") ||
		combined.includes("not recognized as an internal or external command")
	);
}

function exitWithResult(result: SpawnSyncReturns<string>) {
	if (result.error) {
		console.error(`[supabase-migration] ${result.error.message}`);
		process.exit(1);
	}

	if (typeof result.status === "number") {
		process.exit(result.status);
	}

	process.exit(1);
}

function main() {
	loadEnvFile(".env.local");
	loadEnvFile(".env");

	const action = process.argv[2] as Action | undefined;
	const extraArgs = process.argv.slice(3);
	const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL;

	if (!action || (action !== "list" && action !== "push")) {
		console.error("Usage: tsx scripts/supabase-migration.ts <push|list> [extra args]");
		process.exit(1);
	}

	if (!dbUrl) {
		console.error("SUPABASE_DATABASE_URL (or SUPABASE_DB_URL) is required.");
		process.exit(1);
	}

	const command = action === "push" ? ["db", "push"] : ["migration", "list"];
	const { commandArgs, globalArgs } = splitArguments(extraArgs);

	const primaryArgs = ["exec", "supabase", ...globalArgs, ...command, "--db-url", dbUrl, ...commandArgs];
	console.log(`[supabase-migration] Running: pnpm ${primaryArgs.join(" ")}`);
	const primary = runPnpm(primaryArgs);
	emitResult(primary);

	if (!shouldFallback(primary)) {
		exitWithResult(primary);
	}

	const supabaseVersion = resolveSupabaseVersion();
	console.warn(
		`[supabase-migration] Local supabase CLI execution failed. Falling back to pnpm dlx supabase@${supabaseVersion}.`,
	);

	const fallbackArgs = [
		"dlx",
		`supabase@${supabaseVersion}`,
		...globalArgs,
		...command,
		"--db-url",
		dbUrl,
		...commandArgs,
	];
	console.log(`[supabase-migration] Running: pnpm ${fallbackArgs.join(" ")}`);
	const fallback = runPnpm(fallbackArgs);
	emitResult(fallback);
	exitWithResult(fallback);
}

main();
