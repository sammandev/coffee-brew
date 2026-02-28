"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/ui/delete-modal";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WarningModal } from "@/components/ui/warning-modal";

interface FaqRow {
	id: string;
	question_en: string;
	answer_en: string;
	question_id: string;
	answer_id: string;
	order_index: number;
	is_visible: boolean;
}

interface FaqFormState {
	question_en: string;
	answer_en: string;
	question_id: string;
	answer_id: string;
	order_index: string;
	is_visible: boolean;
}

const EMPTY_FORM: FaqFormState = {
	question_en: "",
	answer_en: "",
	question_id: "",
	answer_id: "",
	order_index: "0",
	is_visible: true,
};

function toFormState(item: FaqRow): FaqFormState {
	return {
		question_en: item.question_en,
		answer_en: item.answer_en,
		question_id: item.question_id,
		answer_id: item.answer_id,
		order_index: String(item.order_index),
		is_visible: item.is_visible,
	};
}

function toPayload(form: FaqFormState) {
	return {
		question_en: form.question_en,
		answer_en: form.answer_en,
		question_id: form.question_id,
		answer_id: form.answer_id,
		order_index: Number(form.order_index || 0),
		is_visible: form.is_visible,
	};
}

export function FaqManager({ items }: { items: FaqRow[] }) {
	const { locale, t } = useAppPreferences();
	const router = useRouter();
	const [form, setForm] = useState<FaqFormState>(EMPTY_FORM);
	const [activeItem, setActiveItem] = useState<FaqRow | null>(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [hideTarget, setHideTarget] = useState<FaqRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<FaqRow | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const sortedItems = useMemo(() => [...items].sort((left, right) => left.order_index - right.order_index), [items]);

	function updateForm<K extends keyof FaqFormState>(key: K, value: FaqFormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function openCreate() {
		setForm(EMPTY_FORM);
		setCreateOpen(true);
		setError(null);
	}

	function openEdit(item: FaqRow) {
		setActiveItem(item);
		setForm(toFormState(item));
		setEditOpen(true);
		setError(null);
	}

	async function createFaq() {
		setIsSubmitting(true);
		setError(null);

		const response = await fetch("/api/admin/faq", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(toPayload(form)),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal membuat FAQ." : "Could not create FAQ."));
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		setCreateOpen(false);
		router.refresh();
	}

	async function updateFaq() {
		if (!activeItem) return;

		setIsSubmitting(true);
		setError(null);

		const response = await fetch("/api/admin/faq", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: activeItem.id, ...toPayload(form) }),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal memperbarui FAQ." : "Could not update FAQ."));
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		setEditOpen(false);
		setActiveItem(null);
		router.refresh();
	}

	async function setVisibility(item: FaqRow, isVisible: boolean) {
		setIsSubmitting(true);
		setError(null);

		const response = await fetch("/api/admin/faq", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: item.id, is_visible: isVisible }),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(
				body?.error ?? (locale === "id" ? "Gagal memperbarui visibilitas FAQ." : "Could not update FAQ visibility."),
			);
			setIsSubmitting(false);
			return;
		}

		setIsSubmitting(false);
		setHideTarget(null);
		router.refresh();
	}

	async function deleteFaq() {
		if (!deleteTarget) return;

		setIsSubmitting(true);
		setError(null);

		const response = await fetch("/api/admin/faq", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: deleteTarget.id }),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal menghapus FAQ." : "Could not delete FAQ."));
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
					{locale === "id" ? "Tambah FAQ" : "Add FAQ"}
				</Button>
			</div>

			<div className="overflow-x-auto rounded-3xl border bg-(--surface-elevated)">
				<table className="w-full min-w-190 text-sm">
					<thead>
						<tr className="border-b bg-(--surface) text-left">
							<th className="px-4 py-3">Question (EN)</th>
							<th className="px-4 py-3">Question (ID)</th>
							<th className="px-4 py-3">Order</th>
							<th className="px-4 py-3">Visible</th>
							<th className="px-4 py-3">Actions</th>
						</tr>
					</thead>
					<tbody>
						{sortedItems.map((item) => (
							<tr key={item.id} className="border-b">
								<td className="px-4 py-3">{item.question_en}</td>
								<td className="px-4 py-3">{item.question_id}</td>
								<td className="px-4 py-3">{item.order_index}</td>
								<td className="px-4 py-3">{item.is_visible ? "Yes" : "No"}</td>
								<td className="px-4 py-3">
									<div className="flex flex-wrap gap-2">
										<Button type="button" size="sm" variant="outline" onClick={() => openEdit(item)}>
											{t("common.edit")}
										</Button>
										{item.is_visible ? (
											<Button type="button" size="sm" variant="outline" onClick={() => setHideTarget(item)}>
												{locale === "id" ? "Sembunyikan" : "Hide"}
											</Button>
										) : (
											<Button type="button" size="sm" variant="secondary" onClick={() => setVisibility(item, true)}>
												{locale === "id" ? "Tampilkan" : "Unhide"}
											</Button>
										)}
										<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(item)}>
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
				title={locale === "id" ? "Tambah FAQ" : "Add FAQ"}
				description={locale === "id" ? "Buat item FAQ baru." : "Create a new FAQ item."}
				closeDisabled={isSubmitting}
				footer={
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
							{t("common.cancel")}
						</Button>
						<Button type="button" onClick={createFaq} disabled={isSubmitting}>
							{isSubmitting ? (locale === "id" ? "Menyimpan..." : "Saving...") : t("common.save")}
						</Button>
					</div>
				}
			>
				<FaqFormFields form={form} updateForm={updateForm} />
			</FormModal>

			<FormModal
				open={editOpen}
				onClose={() => setEditOpen(false)}
				title={locale === "id" ? "Ubah FAQ" : "Edit FAQ"}
				description={locale === "id" ? "Perbarui item FAQ." : "Update FAQ item."}
				closeDisabled={isSubmitting}
				footer={
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={isSubmitting}>
							{t("common.cancel")}
						</Button>
						<Button type="button" onClick={updateFaq} disabled={isSubmitting}>
							{isSubmitting ? (locale === "id" ? "Menyimpan..." : "Saving...") : t("common.save")}
						</Button>
					</div>
				}
			>
				<FaqFormFields form={form} updateForm={updateForm} />
			</FormModal>

			<WarningModal
				open={Boolean(hideTarget)}
				onClose={() => setHideTarget(null)}
				onConfirm={() => (hideTarget ? setVisibility(hideTarget, false) : Promise.resolve())}
				isSubmitting={isSubmitting}
				title={locale === "id" ? "Sembunyikan FAQ" : "Hide FAQ"}
				description={
					locale === "id"
						? "FAQ ini tidak akan tampil di halaman publik sampai ditampilkan kembali."
						: "This FAQ will be hidden from the public page until it is shown again."
				}
				confirmLabel={locale === "id" ? "Sembunyikan" : "Hide"}
			/>

			<DeleteModal
				open={Boolean(deleteTarget)}
				onClose={() => setDeleteTarget(null)}
				onConfirm={deleteFaq}
				isSubmitting={isSubmitting}
				title={locale === "id" ? "Hapus FAQ" : "Delete FAQ"}
				description={
					locale === "id" ? "FAQ akan dihapus permanen dari daftar." : "This FAQ will be permanently removed from the list."
				}
				confirmLabel={locale === "id" ? "Hapus" : "Delete"}
			/>
		</div>
	);
}

function FaqFormFields({
	form,
	updateForm,
}: {
	form: FaqFormState;
	updateForm: <K extends keyof FaqFormState>(key: K, value: FaqFormState[K]) => void;
}) {
	return (
		<div className="grid gap-3">
			<div>
				<Label htmlFor="question_en">Question (English)</Label>
				<Input
					id="question_en"
					value={form.question_en}
					onChange={(event) => updateForm("question_en", event.currentTarget.value)}
					required
				/>
			</div>
			<div>
				<Label htmlFor="answer_en">Answer (English)</Label>
				<Textarea
					id="answer_en"
					value={form.answer_en}
					onChange={(event) => updateForm("answer_en", event.currentTarget.value)}
					required
				/>
			</div>
			<div>
				<Label htmlFor="question_id">Question (Bahasa)</Label>
				<Input
					id="question_id"
					value={form.question_id}
					onChange={(event) => updateForm("question_id", event.currentTarget.value)}
					required
				/>
			</div>
			<div>
				<Label htmlFor="answer_id">Answer (Bahasa)</Label>
				<Textarea
					id="answer_id"
					value={form.answer_id}
					onChange={(event) => updateForm("answer_id", event.currentTarget.value)}
					required
				/>
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
