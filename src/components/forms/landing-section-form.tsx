"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function LandingSectionForm() {
	const { t } = useAppPreferences();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		const form = event.currentTarget;

		const formData = new FormData(form);

		const payload = {
			section_type: String(formData.get("section_type")),
			title: String(formData.get("title")),
			title_id: String(formData.get("title_id")) || null,
			subtitle: String(formData.get("subtitle")) || null,
			subtitle_id: String(formData.get("subtitle_id")) || null,
			body: String(formData.get("body")) || null,
			body_id: String(formData.get("body_id")) || null,
			order_index: Number(formData.get("order_index") || 0),
			is_visible: formData.get("is_visible") === "on",
			config: {
				ctaText: String(formData.get("ctaText")) || undefined,
				ctaLink: String(formData.get("ctaLink")) || undefined,
				assetUrl: String(formData.get("assetUrl")) || undefined,
				assetAlt: String(formData.get("assetAlt")) || undefined,
			},
			config_id: {
				ctaText: String(formData.get("ctaTextId")) || undefined,
				ctaLink: String(formData.get("ctaLinkId")) || undefined,
				assetUrl: String(formData.get("assetUrlId")) || undefined,
				assetAlt: String(formData.get("assetAltId")) || undefined,
			},
		};

		const response = await fetch("/api/admin/landing/sections", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = (await response.json()) as { error?: string };
			setError(body.error ?? "Could not save section");
			return;
		}

		form.reset();
		router.refresh();
	}

	return (
		<form className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5" onSubmit={onSubmit}>
			<h3 className="font-heading text-xl text-(--espresso)">{t("admin.landingCms")}</h3>
			<div>
				<Label htmlFor="section_type">Type</Label>
				<Select id="section_type" name="section_type" defaultValue="feature_grid">
					<option value="hero">Hero</option>
					<option value="feature_grid">Feature Grid</option>
					<option value="stats">Stats</option>
					<option value="cta">CTA</option>
					<option value="testimonial">Testimonial</option>
					<option value="custom">Custom</option>
				</Select>
			</div>
			<div>
				<Label htmlFor="title">Title (English)</Label>
				<Input id="title" name="title" required />
			</div>
			<div>
				<Label htmlFor="title_id">Title (Bahasa)</Label>
				<Input id="title_id" name="title_id" />
			</div>
			<div>
				<Label htmlFor="subtitle">Subtitle (English)</Label>
				<Input id="subtitle" name="subtitle" />
			</div>
			<div>
				<Label htmlFor="subtitle_id">Subtitle (Bahasa)</Label>
				<Input id="subtitle_id" name="subtitle_id" />
			</div>
			<div>
				<Label htmlFor="body">Body (English)</Label>
				<Textarea id="body" name="body" />
			</div>
			<div>
				<Label htmlFor="body_id">Body (Bahasa)</Label>
				<Textarea id="body_id" name="body_id" />
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="ctaText">CTA Text (EN)</Label>
					<Input id="ctaText" name="ctaText" />
				</div>
				<div>
					<Label htmlFor="ctaTextId">CTA Text (ID)</Label>
					<Input id="ctaTextId" name="ctaTextId" />
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="ctaLink">CTA Link (EN)</Label>
					<Input id="ctaLink" name="ctaLink" />
				</div>
				<div>
					<Label htmlFor="ctaLinkId">CTA Link (ID)</Label>
					<Input id="ctaLinkId" name="ctaLinkId" />
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="assetUrl">Asset URL (EN)</Label>
					<Input id="assetUrl" name="assetUrl" placeholder="https://..." />
				</div>
				<div>
					<Label htmlFor="assetUrlId">Asset URL (ID)</Label>
					<Input id="assetUrlId" name="assetUrlId" placeholder="https://..." />
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="assetAlt">Asset Alt (EN)</Label>
					<Input id="assetAlt" name="assetAlt" />
				</div>
				<div>
					<Label htmlFor="assetAltId">Asset Alt (ID)</Label>
					<Input id="assetAltId" name="assetAltId" />
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="order_index">Order</Label>
					<Input id="order_index" name="order_index" type="number" defaultValue={0} />
				</div>
				<label className="flex items-center gap-2 self-end text-sm text-(--muted)">
					<input type="checkbox" name="is_visible" defaultChecked className="size-4 rounded border" />
					Visible
				</label>
			</div>
			{error && <p className="text-sm text-(--danger)">{error}</p>}
			<Button type="submit">{t("common.save")}</Button>
		</form>
	);
}
