"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { ACTIONS, RESOURCES } from "@/lib/constants";
import type { Role } from "@/lib/types";

interface RbacMatrixEditorProps {
	role: Role;
	activePermissions: Array<{ resource: string; action: string }>;
}

export function RbacMatrixEditor({ role, activePermissions }: RbacMatrixEditorProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [selected, setSelected] = useState(
		new Set(activePermissions.map((permission) => `${permission.resource}:${permission.action}`)),
	);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const toggle = (key: string) => {
		const next = new Set(selected);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		setSelected(next);
	};

	async function save() {
		setSaving(true);
		setError(null);

		const permissions = Array.from(selected).map((entry) => {
			const [resource, action] = entry.split(":");
			return { resource, action };
		});

		const response = await fetch("/api/superuser/rbac", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ role, permissions }),
		});

		if (!response.ok) {
			const body = (await response.json()) as { error?: string };
			setError(body.error ?? "Could not update permissions");
			setSaving(false);
			return;
		}

		setSaving(false);
		router.refresh();
	}

	return (
		<div className="grid gap-4 rounded-3xl border bg-(--surface-elevated) p-5">
			<h3 className="font-heading text-xl text-(--espresso)">{role} Permissions</h3>
			<div className="grid gap-3 overflow-x-auto">
				<table className="w-full min-w-170 text-sm">
					<thead>
						<tr>
							<th className="px-2 py-1 text-left font-semibold">Resource</th>
							{ACTIONS.map((action) => (
								<th className="px-2 py-1 text-center font-semibold" key={action}>
									{action}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{RESOURCES.map((resource) => (
							<tr key={resource} className="border-t">
								<td className="px-2 py-2 font-medium">{resource}</td>
								{ACTIONS.map((action) => {
									const key = `${resource}:${action}`;
									return (
										<td key={key} className="px-2 py-2 text-center">
											<input type="checkbox" className="size-4" checked={selected.has(key)} onChange={() => toggle(key)} />
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{error && <p className="text-sm text-(--danger)">{error}</p>}
			<div className="flex justify-end">
				<button
					type="button"
					onClick={save}
					disabled={saving}
					className="rounded-full bg-(--espresso) px-5 py-2 text-sm font-semibold text-(--surface-elevated)"
				>
					{saving ? (locale === "id" ? "Menyimpan..." : "Saving...") : locale === "id" ? "Simpan Matriks" : "Save Matrix"}
				</button>
			</div>
		</div>
	);
}
