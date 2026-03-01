import { apiError, apiOk } from "@/lib/api";
import { getSessionContext } from "@/lib/auth";
import { touchUserPresence } from "@/lib/presence";

export async function POST() {
	const session = await getSessionContext();
	if (!session) {
		return apiError("Unauthorized", 401);
	}

	await touchUserPresence(session.userId).catch(() => null);
	return apiOk({ success: true });
}
