import { apiOk } from "@/lib/api";
import { getVisibleFaqItems } from "@/lib/queries";

export const runtime = "edge";

export async function GET() {
	const items = await getVisibleFaqItems();
	return apiOk({ items });
}
