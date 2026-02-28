"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileDisplayNameFormProps {
	initialDisplayName: string;
}

export function ProfileDisplayNameForm({ initialDisplayName }: ProfileDisplayNameFormProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [displayName, setDisplayName] = useState(initialDisplayName);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		setError(null);
		setSuccess(null);

		const response = await fetch("/api/profile", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ display_name: displayName.trim() }),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal memperbarui nama." : "Could not update display name."));
			setIsSaving(false);
			return;
		}

		setSuccess(locale === "id" ? "Nama berhasil diperbarui." : "Display name updated.");
		setIsSaving(false);
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-3 rounded-3xl border bg-(--surface-elevated) p-5">
			<h3 className="font-heading text-xl text-(--espresso)">{locale === "id" ? "Nama Tampilan" : "Display Name"}</h3>
			<div>
				<Label htmlFor="display_name">{locale === "id" ? "Nama" : "Name"}</Label>
				<Input
					id="display_name"
					name="display_name"
					value={displayName}
					onChange={(event) => setDisplayName(event.currentTarget.value)}
					required
				/>
			</div>
			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
			{success ? <p className="text-sm text-(--accent)">{success}</p> : null}
			<div className="flex justify-end">
				<Button type="submit" disabled={isSaving}>
					{isSaving ? (locale === "id" ? "Menyimpan..." : "Saving...") : locale === "id" ? "Simpan" : "Save"}
				</Button>
			</div>
		</form>
	);
}
