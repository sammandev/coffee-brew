"use client";

import { Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
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
	const [busy, setBusy] = useState<string | false>(false);
	const [error, setError] = useState<string | null>(null);

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editKey, setEditKey] = useState("");
	const [editLabelEn, setEditLabelEn] = useState("");
	const [editLabelId, setEditLabelId] = useState("");
	const [editMinPoints, setEditMinPoints] = useState("0");
	const [editColorHex, setEditColorHex] = useState("");

	async function createBadge() {
		setBusy("create");
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
			setError(body?.error ?? (locale === "id" ? "Tidak dapat membuat badge." : "Could not create badge."));
			return;
		}
		window.location.reload();
	}

	async function removeBadge(id: string) {
		setBusy(`del-${id}`);
		setError(null);
		const response = await fetch(`/api/admin/forum/badges?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
			() => null,
		);
		setBusy(false);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Tidak dapat menghapus badge." : "Could not delete badge."));
			return;
		}
		window.location.reload();
	}

	async function toggleVisibility(badge: BadgeDefinitionRecord) {
		setBusy(`toggle-${badge.id}`);
		setError(null);
		const response = await fetch("/api/admin/forum/badges", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: badge.id,
				badge_key: badge.badge_key,
				label_en: badge.label_en,
				label_id: badge.label_id,
				min_points: badge.min_points,
				color_hex: badge.color_hex,
				is_active: !badge.is_active,
			}),
		}).catch(() => null);
		setBusy(false);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Tidak dapat memperbarui badge." : "Could not update badge."));
			return;
		}
		window.location.reload();
	}

	function startEdit(badge: BadgeDefinitionRecord) {
		setEditingId(badge.id);
		setEditKey(badge.badge_key);
		setEditLabelEn(badge.label_en);
		setEditLabelId(badge.label_id);
		setEditMinPoints(String(badge.min_points));
		setEditColorHex(badge.color_hex ?? "");
	}

	async function saveBadge(badge: BadgeDefinitionRecord) {
		setBusy(`edit-${badge.id}`);
		setError(null);
		const response = await fetch("/api/admin/forum/badges", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: badge.id,
				badge_key: editKey || badge.badge_key,
				label_en: editLabelEn || badge.label_en,
				label_id: editLabelId || badge.label_id,
				min_points: Number(editMinPoints),
				color_hex: editColorHex || null,
				is_active: badge.is_active,
			}),
		}).catch(() => null);
		setBusy(false);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Tidak dapat memperbarui badge." : "Could not update badge."));
			return;
		}
		setEditingId(null);
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
					<Button type="button" onClick={() => void createBadge()} disabled={busy !== false || !key || !labelEn}>
						{busy === "create" ? (
							<Loader2 size={14} className="animate-spin" />
						) : locale === "id" ? (
							"Tambah Badge"
						) : (
							"Add Badge"
						)}
					</Button>
				</div>
			</section>

			<section className="space-y-3">
				<h2 className="font-heading text-2xl text-(--espresso)">{locale === "id" ? "Daftar Badge" : "Badge List"}</h2>
				{badges.map((badge) => (
					<div key={badge.id} className="rounded-2xl border bg-(--surface-elevated) p-4">
						{editingId === badge.id ? (
							<div className="grid gap-3">
								<div className="grid gap-3 md:grid-cols-3">
									<div>
										<Label>Key</Label>
										<Input value={editKey} onChange={(e) => setEditKey(e.currentTarget.value)} />
									</div>
									<div>
										<Label>Label (EN)</Label>
										<Input value={editLabelEn} onChange={(e) => setEditLabelEn(e.currentTarget.value)} />
									</div>
									<div>
										<Label>Label (ID)</Label>
										<Input value={editLabelId} onChange={(e) => setEditLabelId(e.currentTarget.value)} />
									</div>
									<div>
										<Label>{locale === "id" ? "Poin Minimum" : "Min Points"}</Label>
										<Input
											type="number"
											min={0}
											value={editMinPoints}
											onChange={(e) => setEditMinPoints(e.currentTarget.value)}
										/>
									</div>
									<div>
										<Label>Color</Label>
										<Input value={editColorHex} onChange={(e) => setEditColorHex(e.currentTarget.value)} />
									</div>
								</div>
								<div className="flex gap-2">
									<Button type="button" size="sm" onClick={() => void saveBadge(badge)} disabled={busy !== false}>
										{locale === "id" ? "Simpan" : "Save"}
									</Button>
									<Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
										{locale === "id" ? "Batal" : "Cancel"}
									</Button>
								</div>
							</div>
						) : (
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p className="font-semibold text-(--espresso)">
										{locale === "id" ? badge.label_id : badge.label_en}{" "}
										<span className="text-xs text-(--muted)">({badge.badge_key})</span>
										{!badge.is_active && (
											<span className="ml-2 text-xs text-(--muted)">({locale === "id" ? "Tersembunyi" : "Hidden"})</span>
										)}
									</p>
									<p className="text-xs text-(--muted)">
										{locale === "id" ? "Min poin" : "Min points"}: {badge.min_points} · {badge.color_hex || "-"}
									</p>
								</div>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => void toggleVisibility(badge)}
										disabled={busy !== false}
										title={badge.is_active ? (locale === "id" ? "Sembunyikan" : "Hide") : locale === "id" ? "Tampilkan" : "Show"}
									>
										{badge.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => startEdit(badge)}
										disabled={busy !== false}
										title={locale === "id" ? "Edit" : "Edit"}
									>
										<Pencil size={14} />
									</Button>
									<Button
										type="button"
										variant="destructive"
										size="sm"
										onClick={() => void removeBadge(badge.id)}
										disabled={busy !== false}
										title={locale === "id" ? "Hapus" : "Delete"}
									>
										<Trash2 size={14} />
									</Button>
								</div>
							</div>
						)}
					</div>
				))}
			</section>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
		</div>
	);
}
