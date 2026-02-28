"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterInlineForm({ defaultEmail = "" }: { defaultEmail?: string }) {
	const { t } = useAppPreferences();
	const [email, setEmail] = useState(defaultEmail);
	const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

	async function subscribe(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setState("loading");

		const response = await fetch("/api/newsletter/subscribe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email,
				consent: true,
				source: "landing",
			}),
		});

		setState(response.ok ? "success" : "error");
	}

	return (
		<form onSubmit={subscribe} className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<Input
				type="email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				required
				placeholder="you@coffee.com"
			/>
			<Button type="submit" disabled={state === "loading"}>
				{state === "loading" ? t("newsletter.joining") : t("newsletter.join")}
			</Button>
			{state === "success" && <span className="text-sm text-(--accent)">{t("newsletter.subscribed")}</span>}
			{state === "error" && <span className="text-sm text-(--danger)">{t("newsletter.tryAgain")}</span>}
		</form>
	);
}
