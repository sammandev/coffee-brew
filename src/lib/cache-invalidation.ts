import { revalidateTag } from "next/cache";
import type { PublicCacheTag } from "@/lib/cache-tags";

export function revalidatePublicCache(tags: PublicCacheTag[]) {
	for (const tag of tags) {
		revalidateTag(tag, "max");
	}
}
