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
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				protocol: "https",
				hostname: "plus.unsplash.com",
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
};

export default nextConfig;
