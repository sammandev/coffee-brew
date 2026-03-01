import { apiOk } from "@/lib/api";
import { getVisibleLandingSections } from "@/lib/queries";

export const runtime = "edge";

export async function GET() {
	const sections = await getVisibleLandingSections();
	return apiOk({ sections });
}
