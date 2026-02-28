"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface Section {
	id: string;
	section_type: string;
	title: string;
	order_index: number;
	is_visible: boolean;
}

export function LandingSectionsTable({ sections }: { sections: Section[] }) {
	const { t } = useAppPreferences();
	const router = useRouter();
	const [loadingId, setLoadingId] = useState<string | null>(null);

	async function updateSection(section: Section, patch: Partial<Section>) {
		setLoadingId(section.id);
		await fetch("/api/admin/landing/sections", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				id: section.id,
				...patch,
			}),
		});
		setLoadingId(null);
		router.refresh();
	}

	async function deleteSection(id: string) {
		setLoadingId(id);
		await fetch("/api/admin/landing/sections", {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ id }),
		});
		setLoadingId(null);
		router.refresh();
	}

	return (
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
					{sections.map((section) => (
						<tr key={section.id} className="border-b">
							<td className="px-4 py-3">{section.title}</td>
							<td className="px-4 py-3">{section.section_type}</td>
							<td className="px-4 py-3">
								<Input
									type="number"
									defaultValue={section.order_index}
									className="h-9 max-w-20"
									onBlur={(event) =>
										updateSection(section, {
											order_index: Number(event.currentTarget.value),
										})
									}
								/>
							</td>
							<td className="px-4 py-3">
								<Checkbox
									defaultChecked={section.is_visible}
									onChange={(event) => updateSection(section, { is_visible: event.currentTarget.checked })}
								/>
							</td>
							<td className="px-4 py-3">
								<Button
									variant="destructive"
									size="sm"
									onClick={() => deleteSection(section.id)}
									disabled={loadingId === section.id}
								>
									{t("common.delete")}
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
