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
	experimental: {
		authInterrupts: true,
	},
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
};

export default nextConfig;
