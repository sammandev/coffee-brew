"use client";

import { Eye, EyeOff, Globe, Loader2, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ProfileVisibilityFormProps {
	initialIsProfilePrivate: boolean;
	initialShowOnlineStatus: boolean;
	publicProfileHref: string;
}

export function ProfileVisibilityForm({
	initialIsProfilePrivate,
	initialShowOnlineStatus,
	publicProfileHref,
}: ProfileVisibilityFormProps) {
	const { locale } = useAppPreferences();
	const [isProfilePrivate, setIsProfilePrivate] = useState(initialIsProfilePrivate);
	const [showOnlineStatus, setShowOnlineStatus] = useState(initialShowOnlineStatus);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	async function onSave() {
		setIsSaving(true);
		setError(null);
		setSuccess(null);

		const response = await fetch("/api/profile", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				is_profile_private: isProfilePrivate,
				show_online_status: showOnlineStatus,
			}),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(
				body?.error ?? (locale === "id" ? "Gagal menyimpan pengaturan privasi." : "Could not save privacy settings."),
			);
			setIsSaving(false);
			return;
		}

		setSuccess(locale === "id" ? "Pengaturan privasi berhasil disimpan." : "Privacy settings saved.");
		setIsSaving(false);
	}

	return (
		<section className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-5">
			<div>
				<h3 className="font-heading text-xl text-(--espresso)">
					{locale === "id" ? "Profil Publik & Privasi" : "Public Profile & Privacy"}
				</h3>
				<p className="mt-1 text-sm text-(--muted)">
					{locale === "id"
						? "Atur visibilitas profil publik dan status online Anda."
						: "Control your public profile visibility and online status sharing."}
				</p>
			</div>

			<div className="grid gap-3">
				<div className="flex items-center gap-2 text-sm">
					<Checkbox checked={!isProfilePrivate} onChange={(event) => setIsProfilePrivate(!event.currentTarget.checked)} />
					<span className="inline-flex items-center gap-2">
						<Globe size={14} />
						{locale === "id" ? "Profil publik dapat dilihat pengguna lain" : "Allow other users to view my public profile"}
					</span>
				</div>
				<div className="flex items-center gap-2 text-sm">
					<Checkbox checked={showOnlineStatus} onChange={(event) => setShowOnlineStatus(event.currentTarget.checked)} />
					<span className="inline-flex items-center gap-2">
						<UserRoundCheck size={14} />
						{locale === "id" ? "Tampilkan status online/offline saya" : "Show my online/offline status to other users"}
					</span>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Link
					href={publicProfileHref}
					className="inline-flex h-9 items-center gap-2 rounded-md border border-(--border) bg-(--surface) px-3 text-sm font-semibold transition hover:bg-(--sand)/20"
				>
					{isProfilePrivate ? <EyeOff size={15} /> : <Eye size={15} />}
					{locale === "id" ? "Pratinjau Profil Publik" : "Preview Public Profile"}
				</Link>
				<Button type="button" onClick={() => void onSave()} disabled={isSaving}>
					{isSaving ? (
						<span className="inline-flex items-center gap-2">
							<Loader2 size={14} className="animate-spin" />
							{locale === "id" ? "Menyimpan..." : "Saving..."}
						</span>
					) : locale === "id" ? (
						"Simpan Pengaturan"
					) : (
						"Save Settings"
					)}
				</Button>
			</div>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
			{success ? <p className="text-sm text-(--accent)">{success}</p> : null}
		</section>
	);
}
