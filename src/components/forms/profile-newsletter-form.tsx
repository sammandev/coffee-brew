"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileNewsletterForm({ email, subscribed }: { email: string; subscribed: boolean }) {
	const { locale, t } = useAppPreferences();
	const [status, setStatus] = useState(subscribed ? "subscribed" : "not_subscribed");
	const [loading, setLoading] = useState(false);

	async function subscribe() {
		setLoading(true);
		const response = await fetch("/api/newsletter/subscribe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, consent: true, source: "profile" }),
		});
		if (response.ok) setStatus("subscribed");
		setLoading(false);
	}

	async function unsubscribe() {
		setLoading(true);
		const response = await fetch("/api/newsletter/unsubscribe", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});
		if (response.ok) setStatus("not_subscribed");
		setLoading(false);
	}

	return (
		<div className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5">
			<h3 className="font-heading text-xl text-(--espresso)">
				{locale === "id" ? "Preferensi Newsletter" : "Newsletter Preferences"}
			</h3>
			<Input value={email} disabled />
			<p className="text-sm text-(--muted)">
				{locale === "id" ? "Status saat ini:" : "Current status:"}{" "}
				{status === "subscribed" ? t("newsletter.subscribed") : "Not subscribed"}
			</p>
			<div className="flex gap-2">
				<Button type="button" onClick={subscribe} disabled={loading}>
					{locale === "id" ? "Berlangganan" : "Subscribe"}
				</Button>
				<Button type="button" onClick={unsubscribe} variant="outline" disabled={loading}>
					{locale === "id" ? "Berhenti" : "Unsubscribe"}
				</Button>
			</div>
		</div>
	);
}
