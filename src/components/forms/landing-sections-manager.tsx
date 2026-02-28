"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/ui/delete-modal";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WarningModal } from "@/components/ui/warning-modal";

interface SectionRow {
	id: string;
	section_type: string;
	title: string;
	title_id: string | null;
	subtitle: string | null;
	subtitle_id: string | null;
	body: string | null;
	body_id: string | null;
	config: Record<string, unknown>;
	config_id: Record<string, unknown>;
	order_index: number;
	is_visible: boolean;
}

interface SectionFormState {
	section_type: string;
	title: string;
	title_id: string;
	subtitle: string;
	subtitle_id: string;
	body: string;
	body_id: string;
	ctaText: string;
	ctaTextId: string;
	ctaLink: string;
	ctaLinkId: string;
	assetUrl: string;
	assetUrlId: string;
	assetAlt: string;
	assetAltId: string;
	order_index: string;
	is_visible: boolean;
}

const EMPTY_FORM: SectionFormState = {
	section_type: "feature_grid",
	title: "",
	title_id: "",
	subtitle: "",
	subtitle_id: "",
	body: "",
	body_id: "",
	ctaText: "",
	ctaTextId: "",
	ctaLink: "",
	ctaLinkId: "",
	assetUrl: "",
	assetUrlId: "",
	assetAlt: "",
	assetAltId: "",
	order_index: "0",
	is_visible: true,
};

function toFormState(section: SectionRow): SectionFormState {
	return {
		section_type: section.section_type,
		title: section.title,
		title_id: section.title_id ?? "",
		subtitle: section.subtitle ?? "",
		subtitle_id: section.subtitle_id ?? "",
		body: section.body ?? "",
		body_id: section.body_id ?? "",
		ctaText: String(section.config?.ctaText ?? ""),
		ctaTextId: String(section.config_id?.ctaText ?? ""),
		ctaLink: String(section.config?.ctaLink ?? ""),
		ctaLinkId: String(section.config_id?.ctaLink ?? ""),
		assetUrl: String(section.config?.assetUrl ?? ""),
		assetUrlId: String(section.config_id?.assetUrl ?? ""),
		assetAlt: String(section.config?.assetAlt ?? ""),
		assetAltId: String(section.config_id?.assetAlt ?? ""),
		order_index: String(section.order_index),
		is_visible: section.is_visible,
	};
}

function toPayload(form: SectionFormState) {
	return {
		section_type: form.section_type,
		title: form.title,
		title_id: form.title_id.trim() || null,
		subtitle: form.subtitle.trim() || null,
		subtitle_id: form.subtitle_id.trim() || null,
		body: form.body.trim() || null,
		body_id: form.body_id.trim() || null,
		order_index: Number(form.order_index || 0),
		is_visible: form.is_visible,
		config: {
			ctaText: form.ctaText.trim() || undefined,
			ctaLink: form.ctaLink.trim() || undefined,
			assetUrl: form.assetUrl.trim() || undefined,
			assetAlt: form.assetAlt.trim() || undefined,
		},
		config_id: {
			ctaText: form.ctaTextId.trim() || undefined,
			ctaLink: form.ctaLinkId.trim() || undefined,
			assetUrl: form.assetUrlId.trim() || undefined,
			assetAlt: form.assetAltId.trim() || undefined,
		},
	};
}

export function LandingSectionsManager({ sections }: { sections: SectionRow[] }) {
	const { locale, t } = useAppPreferences();
	const router = useRouter();
	const [form, setForm] = useState<SectionFormState>(EMPTY_FORM);
	const [activeSection, setActiveSection] = useState<SectionRow | null>(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [hideTarget, setHideTarget] = useState<SectionRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<SectionRow | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sortedSections = useMemo(
		() => [...sections].sort((left, right) => left.order_index - right.order_index),
		[sections],
	);

	function updateForm<K extends keyof SectionFormState>(key: K, value: SectionFormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function openCreate() {
		setForm(EMPTY_FORM);
		setActiveSection(null);
		setCreateOpen(true);
		setError(null);
	}

	function openEdit(section: SectionRow) {
		setForm(toFormState(section));
		setActiveSection(section);
		setEditOpen(true);
		setError(null);
	}

	async function createSection() {
		setIsSubmitting(true);
		setError(null);

		const response = await fetch("/api/admin/landing/sections", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(toPayload(form)),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal membuat section." : "Could not create section."));
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		setCreateOpen(false);
		router.refresh();
	}

	async function updateSection() {
		if (!activeSection) return;
		setIsSubmitting(true);
		setError(null);

		const response = await fetch("/api/admin/landing/sections", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: activeSection.id, ...toPayload(form) }),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal memperbarui section." : "Could not update section."));
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		setEditOpen(false);
		setActiveSection(null);
		router.refresh();
	}

	async function setVisibility(section: SectionRow, isVisible: boolean) {
		setIsSubmitting(true);
		setError(null);

		const response = await fetch("/api/admin/landing/sections", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: section.id, is_visible: isVisible }),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal memperbarui visibilitas." : "Could not update visibility."));
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		setHideTarget(null);
		router.refresh();
	}

	async function deleteSection() {
		if (!deleteTarget) return;

		setIsSubmitting(true);
		setError(null);

		const response = await fetch("/api/admin/landing/sections", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: deleteTarget.id }),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal menghapus section." : "Could not delete section."));
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		setDeleteTarget(null);
		router.refresh();
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-end">
				<Button type="button" onClick={openCreate}>
					{locale === "id" ? "Tambah Section" : "Add Section"}
				</Button>
			</div>

			<div className="overflow-x-auto rounded-3xl border bg-(--surface-elevated)">
				<table className="w-full min-w-160 text-sm">
					<thead>
						<tr className="border-b bg-(--surface) text-left">
							<th className="px-4 py-3">Title</th>
							<th className="px-4 py-3">Type</th>
							<th className="px-4 py-3">Order</th>
							<th className="px-4 py-3">Visible</th>
							<th className="px-4 py-3">Actions</th>
						</tr>
					</thead>
					<tbody>
						{sortedSections.map((section) => (
							<tr key={section.id} className="border-b">
								<td className="px-4 py-3">{section.title}</td>
								<td className="px-4 py-3">{section.section_type}</td>
								<td className="px-4 py-3">{section.order_index}</td>
								<td className="px-4 py-3">{section.is_visible ? "Yes" : "No"}</td>
								<td className="px-4 py-3">
									<div className="flex flex-wrap gap-2">
										<Button type="button" size="sm" variant="outline" onClick={() => openEdit(section)}>
											{t("common.edit")}
										</Button>
										{section.is_visible ? (
											<Button type="button" size="sm" variant="outline" onClick={() => setHideTarget(section)}>
												{locale === "id" ? "Sembunyikan" : "Hide"}
											</Button>
										) : (
											<Button
												type="button"
												size="sm"
												variant="secondary"
												onClick={() => setVisibility(section, true)}
												disabled={isSubmitting}
											>
												{locale === "id" ? "Tampilkan" : "Unhide"}
											</Button>
										)}
										<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(section)}>
											{t("common.delete")}
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}

			<FormModal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				title={locale === "id" ? "Tambah Section" : "Add Section"}
				description={locale === "id" ? "Buat blok konten landing baru." : "Create a new landing content block."}
				closeDisabled={isSubmitting}
				footer={
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
							{t("common.cancel")}
						</Button>
						<Button type="button" onClick={createSection} disabled={isSubmitting}>
							{isSubmitting ? (locale === "id" ? "Menyimpan..." : "Saving...") : t("common.save")}
						</Button>
					</div>
				}
			>
				<SectionFormFields form={form} updateForm={updateForm} />
			</FormModal>

			<FormModal
				open={editOpen}
				onClose={() => setEditOpen(false)}
				title={locale === "id" ? "Ubah Section" : "Edit Section"}
				description={locale === "id" ? "Perbarui detail section landing." : "Update landing section details."}
				closeDisabled={isSubmitting}
				footer={
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={isSubmitting}>
							{t("common.cancel")}
						</Button>
						<Button type="button" onClick={updateSection} disabled={isSubmitting}>
							{isSubmitting ? (locale === "id" ? "Menyimpan..." : "Saving...") : t("common.save")}
						</Button>
					</div>
				}
			>
				<SectionFormFields form={form} updateForm={updateForm} />
			</FormModal>

			<WarningModal
				open={Boolean(hideTarget)}
				onClose={() => setHideTarget(null)}
				onConfirm={() => (hideTarget ? setVisibility(hideTarget, false) : Promise.resolve())}
				isSubmitting={isSubmitting}
				title={locale === "id" ? "Sembunyikan Section" : "Hide Section"}
				description={
					locale === "id"
						? "Section ini tidak akan tampil di halaman publik sampai ditampilkan kembali."
						: "This section will be hidden from the public page until it is shown again."
				}
				confirmLabel={locale === "id" ? "Sembunyikan" : "Hide"}
			/>

			<DeleteModal
				open={Boolean(deleteTarget)}
				onClose={() => setDeleteTarget(null)}
				onConfirm={deleteSection}
				isSubmitting={isSubmitting}
				title={locale === "id" ? "Hapus Section" : "Delete Section"}
				description={
					locale === "id"
						? "Section akan dihapus permanen dari landing page."
						: "This section will be permanently deleted from the landing page."
				}
				confirmLabel={locale === "id" ? "Hapus" : "Delete"}
			/>
		</div>
	);
}

function SectionFormFields({
	form,
	updateForm,
}: {
	form: SectionFormState;
	updateForm: <K extends keyof SectionFormState>(key: K, value: SectionFormState[K]) => void;
}) {
	return (
		<div className="grid gap-3">
			<div>
				<Label htmlFor="section_type">Type</Label>
				<Select
					id="section_type"
					value={form.section_type}
					onChange={(event) => updateForm("section_type", event.currentTarget.value)}
				>
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
				<Input
					id="title"
					value={form.title}
					onChange={(event) => updateForm("title", event.currentTarget.value)}
					required
				/>
			</div>
			<div>
				<Label htmlFor="title_id">Title (Bahasa)</Label>
				<Input
					id="title_id"
					value={form.title_id}
					onChange={(event) => updateForm("title_id", event.currentTarget.value)}
				/>
			</div>
			<div>
				<Label htmlFor="subtitle">Subtitle (English)</Label>
				<Input
					id="subtitle"
					value={form.subtitle}
					onChange={(event) => updateForm("subtitle", event.currentTarget.value)}
				/>
			</div>
			<div>
				<Label htmlFor="subtitle_id">Subtitle (Bahasa)</Label>
				<Input
					id="subtitle_id"
					value={form.subtitle_id}
					onChange={(event) => updateForm("subtitle_id", event.currentTarget.value)}
				/>
			</div>
			<div>
				<Label htmlFor="body">Body (English)</Label>
				<Textarea id="body" value={form.body} onChange={(event) => updateForm("body", event.currentTarget.value)} />
			</div>
			<div>
				<Label htmlFor="body_id">Body (Bahasa)</Label>
				<Textarea
					id="body_id"
					value={form.body_id}
					onChange={(event) => updateForm("body_id", event.currentTarget.value)}
				/>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="ctaText">CTA Text (EN)</Label>
					<Input id="ctaText" value={form.ctaText} onChange={(event) => updateForm("ctaText", event.currentTarget.value)} />
				</div>
				<div>
					<Label htmlFor="ctaTextId">CTA Text (ID)</Label>
					<Input
						id="ctaTextId"
						value={form.ctaTextId}
						onChange={(event) => updateForm("ctaTextId", event.currentTarget.value)}
					/>
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="ctaLink">CTA Link (EN)</Label>
					<Input id="ctaLink" value={form.ctaLink} onChange={(event) => updateForm("ctaLink", event.currentTarget.value)} />
				</div>
				<div>
					<Label htmlFor="ctaLinkId">CTA Link (ID)</Label>
					<Input
						id="ctaLinkId"
						value={form.ctaLinkId}
						onChange={(event) => updateForm("ctaLinkId", event.currentTarget.value)}
					/>
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="assetUrl">Asset URL (EN)</Label>
					<Input
						id="assetUrl"
						value={form.assetUrl}
						onChange={(event) => updateForm("assetUrl", event.currentTarget.value)}
					/>
				</div>
				<div>
					<Label htmlFor="assetUrlId">Asset URL (ID)</Label>
					<Input
						id="assetUrlId"
						value={form.assetUrlId}
						onChange={(event) => updateForm("assetUrlId", event.currentTarget.value)}
					/>
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="assetAlt">Asset Alt (EN)</Label>
					<Input
						id="assetAlt"
						value={form.assetAlt}
						onChange={(event) => updateForm("assetAlt", event.currentTarget.value)}
					/>
				</div>
				<div>
					<Label htmlFor="assetAltId">Asset Alt (ID)</Label>
					<Input
						id="assetAltId"
						value={form.assetAltId}
						onChange={(event) => updateForm("assetAltId", event.currentTarget.value)}
					/>
				</div>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				<div>
					<Label htmlFor="order_index">Order</Label>
					<Input
						id="order_index"
						type="number"
						value={form.order_index}
						onChange={(event) => updateForm("order_index", event.currentTarget.value)}
					/>
				</div>
				<label className="flex items-center gap-2 self-end text-sm text-(--muted)">
					<input
						type="checkbox"
						checked={form.is_visible}
						onChange={(event) => updateForm("is_visible", event.currentTarget.checked)}
						className="size-4 rounded border"
					/>
					Visible
				</label>
			</div>
		</div>
	);
}
