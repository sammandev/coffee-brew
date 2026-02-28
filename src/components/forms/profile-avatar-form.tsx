"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/ui/delete-modal";

interface ProfileAvatarFormProps {
	displayName: string;
	initialAvatarUrl: string | null;
}

function resolveInitial(displayName: string) {
	const text = displayName.trim();
	if (!text) return "U";
	return text.charAt(0).toUpperCase();
}

export function ProfileAvatarForm({ displayName, initialAvatarUrl }: ProfileAvatarFormProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
	const [uploading, setUploading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.currentTarget.files?.[0];
		if (!file) return;

		setUploading(true);
		setError(null);
		setSuccess(null);

		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch("/api/profile/avatar", {
			method: "POST",
			body: formData,
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal mengunggah avatar." : "Could not upload avatar."));
			setUploading(false);
			return;
		}

		const body = (await response.json()) as { avatar_url?: string | null };
		setAvatarUrl(body.avatar_url ?? null);
		setSuccess(locale === "id" ? "Foto profil berhasil diperbarui." : "Profile photo updated.");
		setUploading(false);
		router.refresh();
	}

	async function onDeleteAvatar() {
		setDeleting(true);
		setError(null);
		setSuccess(null);

		const response = await fetch("/api/profile/avatar", {
			method: "DELETE",
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal menghapus avatar." : "Could not remove avatar."));
			setDeleting(false);
			return;
		}

		setAvatarUrl(null);
		setSuccess(locale === "id" ? "Foto profil dihapus." : "Profile photo removed.");
		setDeleting(false);
		setDeleteOpen(false);
		router.refresh();
	}

	return (
		<>
			<div className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5">
				<h3 className="font-heading text-xl text-(--espresso)">{locale === "id" ? "Foto Profil" : "Profile Photo"}</h3>
				<div className="flex items-center gap-3">
					<span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--sand)/20 text-lg font-semibold text-(--espresso)">
						{avatarUrl ? (
							<Image src={avatarUrl} alt={displayName} width={64} height={64} className="h-full w-full object-cover" />
						) : (
							resolveInitial(displayName)
						)}
					</span>
					<div className="flex flex-wrap gap-2">
						<label className="inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-semibold text-foreground hover:bg-(--sand)/15">
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp"
								onChange={onUpload}
								disabled={uploading || deleting}
								className="hidden"
							/>
							{uploading ? (locale === "id" ? "Mengunggah..." : "Uploading...") : locale === "id" ? "Unggah" : "Upload"}
						</label>

						{avatarUrl ? (
							<Button
								type="button"
								variant="destructive"
								size="sm"
								onClick={() => setDeleteOpen(true)}
								disabled={uploading || deleting}
							>
								{locale === "id" ? "Hapus" : "Delete"}
							</Button>
						) : null}
					</div>
				</div>

				<p className="text-xs text-(--muted)">
					{locale === "id" ? "Format: JPG, PNG, WEBP. Maks 2MB." : "Formats: JPG, PNG, WEBP. Max 2MB."}
				</p>
				{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
				{success ? <p className="text-sm text-(--accent)">{success}</p> : null}
			</div>

			<DeleteModal
				open={deleteOpen}
				onClose={() => setDeleteOpen(false)}
				onConfirm={onDeleteAvatar}
				isSubmitting={deleting}
				title={locale === "id" ? "Hapus Foto Profil" : "Delete Profile Photo"}
				description={
					locale === "id"
						? "Foto profil akan dihapus dan avatar akan kembali ke inisial nama."
						: "Your profile photo will be removed and replaced with initials."
				}
				confirmLabel={locale === "id" ? "Hapus" : "Delete"}
			/>
		</>
	);
}
