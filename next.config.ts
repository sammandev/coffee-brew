import type { NextConfig } from "next";

function resolveSupabaseHostname() {
	const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (!value) return null;

	try {
		return new URL(value).hostname;
	} catch {
		return null;
	}
}

const supabaseHostname = resolveSupabaseHostname();

const nextConfig: NextConfig = {
	reactStrictMode: true,
	poweredByHeader: false,
	compress: true,
	experimental: {
		authInterrupts: true,
		optimizePackageImports: ["lucide-react"],
	},
	images: {
		formats: ["image/avif", "image/webp"],
		minimumCacheTTL: 60 * 60 * 24 * 7,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "plus.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			...(supabaseHostname
				? [
						{
							protocol: "https" as const,
							hostname: supabaseHostname,
						},
					]
				: []),
		],
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
			{
				source: "/_next/static/:path*",
				headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
			},
			{
				source: "/sitemap.xml",
				headers: [{ key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" }],
			},
		];
	},
};

export default nextConfig;
