"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WishlistToggleButtonProps {
	brewId: string;
	initialWishlisted?: boolean;
	locale: "en" | "id";
}

export function WishlistToggleButton({ brewId, initialWishlisted = false, locale }: WishlistToggleButtonProps) {
	const [wishlisted, setWishlisted] = useState(initialWishlisted);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onToggle() {
		if (isLoading) return;
		setIsLoading(true);
		setError(null);
		const response = await fetch(wishlisted ? `/api/brews/wishlist/${brewId}` : "/api/brews/wishlist", {
			method: wishlisted ? "DELETE" : "POST",
			headers: wishlisted
				? undefined
				: {
						"Content-Type": "application/json",
					},
			body: wishlisted ? undefined : JSON.stringify({ brewId }),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal memperbarui wishlist." : "Could not update wishlist."));
			setIsLoading(false);
			return;
		}

		setWishlisted((current) => !current);
		setIsLoading(false);
	}

	return (
		<div className="space-y-1">
			<Button
				type="button"
				size="sm"
				variant={wishlisted ? "secondary" : "outline"}
				className={cn("gap-2", wishlisted && "border-(--danger)/30 bg-(--danger)/10 text-(--danger) hover:bg-(--danger)/20")}
				onClick={() => void onToggle()}
				disabled={isLoading}
				aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
			>
				<Heart size={14} className={cn(wishlisted ? "fill-(--danger) text-(--danger)" : "")} />
				{wishlisted ? (locale === "id" ? "Wishlist" : "Wishlisted") : locale === "id" ? "Simpan" : "Wishlist"}
			</Button>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</div>
	);
}
