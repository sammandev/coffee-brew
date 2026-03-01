"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Input } from "@/components/ui/input";

interface UserDisplayNameEditorProps {
	displayName: string;
	userId: string;
}

export function UserDisplayNameEditor({ displayName, userId }: UserDisplayNameEditorProps) {
	const { locale } = useAppPreferences();
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(displayName);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function save() {
		const trimmed = value.trim();
		if (!trimmed || trimmed.length < 2) return;
		setBusy(true);
		setError(null);
		const response = await fetch(`/api/superuser/users/${encodeURIComponent(userId)}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ display_name: trimmed }),
		}).catch(() => null);
		setBusy(false);
		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal menyimpan." : "Could not save."));
			return;
		}
		setEditing(false);
		window.location.reload();
	}

	if (!editing) {
		return (
			<span className="inline-flex items-center gap-1.5">
				<span className="font-semibold text-(--espresso)">{displayName}</span>
				<button
					type="button"
					onClick={() => {
						setValue(displayName);
						setEditing(true);
					}}
					className="inline-flex h-6 w-6 items-center justify-center rounded-md text-(--muted) hover:text-(--espresso)"
					title={locale === "id" ? "Ubah nama tampilan" : "Edit display name"}
				>
					<Pencil size={12} />
				</button>
			</span>
		);
	}

	return (
		<div className="inline-flex flex-col gap-1">
			<div className="inline-flex items-center gap-1">
				<Input
					value={value}
					onChange={(e) => setValue(e.currentTarget.value)}
					className="h-8 w-48 text-sm"
					disabled={busy}
					autoFocus
					onKeyDown={(e) => {
						if (e.key === "Enter") void save();
						if (e.key === "Escape") setEditing(false);
					}}
				/>
				<button
					type="button"
					onClick={() => void save()}
					disabled={busy || value.trim().length < 2}
					className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--accent) hover:bg-(--sand)/20 disabled:opacity-40"
					title={locale === "id" ? "Simpan" : "Save"}
				>
					<Check size={14} />
				</button>
				<button
					type="button"
					onClick={() => setEditing(false)}
					className="inline-flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--sand)/20"
					title={locale === "id" ? "Batal" : "Cancel"}
				>
					<X size={14} />
				</button>
			</div>
			{error ? <p className="text-xs text-(--danger)">{error}</p> : null}
		</div>
	);
}
