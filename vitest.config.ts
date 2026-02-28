import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
		setupFiles: ["./vitest.setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
		},
	},
});
