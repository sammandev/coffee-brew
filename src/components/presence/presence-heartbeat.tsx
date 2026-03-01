"use client";

import { useEffect, useRef } from "react";
import { PRESENCE_TOUCH_INTERVAL_MS } from "@/lib/presence-constants";

interface PresenceHeartbeatProps {
	endpoint?: string;
}

export function PresenceHeartbeat({ endpoint = "/api/presence/touch" }: PresenceHeartbeatProps) {
	const lastSentAtRef = useRef(0);

	useEffect(() => {
		let active = true;

		const ping = () => {
			if (!active) return;
			if (document.visibilityState !== "visible") return;
			const now = Date.now();
			if (now - lastSentAtRef.current < PRESENCE_TOUCH_INTERVAL_MS) return;
			lastSentAtRef.current = now;
			void fetch(endpoint, {
				method: "POST",
				keepalive: true,
				headers: {
					"Content-Type": "application/json",
				},
			}).catch(() => null);
		};

		ping();
		const interval = window.setInterval(ping, PRESENCE_TOUCH_INTERVAL_MS);
		window.addEventListener("focus", ping);
		document.addEventListener("visibilitychange", ping);

		return () => {
			active = false;
			window.clearInterval(interval);
			window.removeEventListener("focus", ping);
			document.removeEventListener("visibilitychange", ping);
		};
	}, [endpoint]);

	return null;
}
