"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BadgeDefinitionRecord } from "@/lib/types";

interface BadgeDefinitionsManagerProps {
	badges: BadgeDefinitionRecord[];
}

export function BadgeDefinitionsManager({ badges }: BadgeDefinitionsManagerProps) {
	const { locale } = useAppPreferences();
	const [key, setKey] = useState("");
	const [labelEn, setLabelEn] = useState("");
	const [labelId, setLabelId] = useState("");
	const [minPoints, setMinPoints] = useState("0");
	const [colorHex, setColorHex] = useState("#7A6A58");
	const [isActive, setIsActive] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function createBadge() {
		setBusy(true);
		setError(null);
		const response = await fetch("/api/admin/forum/badges", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				badge_key: key,
				label_en: labelEn,
				label_id: labelId || labelEn,
				min_points: Number(minPoints),
				color_hex: colorHex || null,
				is_active: isActive,
			}),
		}).catch(() => null);
		setBusy(false);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not create badge.");
			return;
		}
		window.location.reload();
	}

	async function removeBadge(id: string) {
		setBusy(true);
		setError(null);
		const response = await fetch(`/api/admin/forum/badges?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
			() => null,
		);
		setBusy(false);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? "Could not delete badge.");
			return;
		}
		window.location.reload();
	}

	return (
		<div className="space-y-6">
			<section className="grid gap-3 rounded-2xl border bg-(--surface-elevated) p-4">
				<h2 className="font-heading text-xl text-(--espresso)">{locale === "id" ? "Buat Badge" : "Create Badge"}</h2>
				<div className="grid gap-3 md:grid-cols-3">
					<div>
						<Label htmlFor="badge-key">Key</Label>
						<Input id="badge-key" value={key} onChange={(event) => setKey(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="badge-label-en">Label (EN)</Label>
						<Input id="badge-label-en" value={labelEn} onChange={(event) => setLabelEn(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="badge-label-id">Label (ID)</Label>
						<Input id="badge-label-id" value={labelId} onChange={(event) => setLabelId(event.currentTarget.value)} />
					</div>
					<div>
						<Label htmlFor="badge-points">{locale === "id" ? "Poin Minimum" : "Minimum Points"}</Label>
						<Input
							id="badge-points"
							type="number"
							min={0}
							value={minPoints}
							onChange={(event) => setMinPoints(event.currentTarget.value)}
						/>
					</div>
					<div>
						<Label htmlFor="badge-color">Color</Label>
						<Input id="badge-color" value={colorHex} onChange={(event) => setColorHex(event.currentTarget.value)} />
					</div>
					<div className="flex items-end">
						<Label htmlFor="badge-active" className="inline-flex items-center gap-2 text-sm">
							<Checkbox id="badge-active" checked={isActive} onChange={(event) => setIsActive(event.currentTarget.checked)} />
							<span>{locale === "id" ? "Aktif" : "Active"}</span>
						</Label>
					</div>
				</div>
				<div className="flex justify-end">
					<Button type="button" onClick={() => void createBadge()} disabled={busy || !key || !labelEn}>
						{busy ? "..." : locale === "id" ? "Tambah Badge" : "Add Badge"}
					</Button>
				</div>
			</section>

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-(--espresso)">{locale === "id" ? "Daftar Badge" : "Badge List"}</h2>
				{badges.map((badge) => (
					<div
						key={badge.id}
						className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-(--surface-elevated) p-4"
					>
						<div>
							<p className="font-semibold text-(--espresso)">
								{locale === "id" ? badge.label_id : badge.label_en}{" "}
								<span className="text-xs text-(--muted)">({badge.badge_key})</span>
							</p>
							<p className="text-xs text-(--muted)">
								{locale === "id" ? "Min poin" : "Min points"}: {badge.min_points} · {badge.color_hex || "-"}
							</p>
						</div>
						<Button type="button" variant="destructive" size="sm" onClick={() => void removeBadge(badge.id)} disabled={busy}>
							{locale === "id" ? "Hapus" : "Delete"}
						</Button>
					</div>
				))}
			</section>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
		</div>
	);
}
