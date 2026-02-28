const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const action = process.argv[2];
const extraArgs = process.argv.slice(3);

function parseEnvLine(line) {
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

function loadEnvFile(filename) {
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

loadEnvFile(".env.local");
loadEnvFile(".env");

const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!action || !["push", "list"].includes(action)) {
	console.error("Usage: node scripts/supabase-migration.js <push|list>");
	process.exit(1);
}

if (!dbUrl) {
	console.error("SUPABASE_DATABASE_URL (or SUPABASE_DB_URL) is required.");
	process.exit(1);
}

const cli = path.join(
	process.cwd(),
	"node_modules",
	".bin",
	process.platform === "win32" ? "supabase.cmd" : "supabase",
);
const command = action === "push" ? ["db", "push"] : ["migration", "list"];

const globalFlagsWithValue = new Set(["--output", "-o", "--profile", "--dns-resolver", "--network-id", "--workdir"]);
const globalBooleanFlags = new Set(["--create-ticket", "--debug", "--experimental", "--yes"]);
const globalArgs = [];
const commandArgs = [];

for (let index = 0; index < extraArgs.length; index += 1) {
	const arg = extraArgs[index];

	if (globalFlagsWithValue.has(arg)) {
		globalArgs.push(arg);
		if (index + 1 < extraArgs.length) {
			globalArgs.push(extraArgs[index + 1]);
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

const commandText =
	`"${cli}" ${globalArgs.join(" ")} ${command.join(" ")} --db-url "${dbUrl}" ${commandArgs.join(" ")}`.trim();
const result = spawnSync(commandText, { stdio: "inherit", shell: true });

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}

if (typeof result.status === "number") {
	process.exit(result.status);
}

process.exit(1);
