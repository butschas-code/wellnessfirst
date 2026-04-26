/**
 * Cloudflare worker bindings. Regenerate with `npm run generate-types` after
 * updating wrangler config (KV, D1, secrets, etc.).
 */
interface Env {
	// ASSETS: Fetcher;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;
declare namespace App {
	interface Locals extends Runtime {
		// add request-scoped data for Phase 2+
	}
}
