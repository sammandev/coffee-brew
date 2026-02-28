"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FaqRow {
	id: string;
	question_en: string;
	question_id: string;
	order_index: number;
	is_visible: boolean;
}

export function FaqTable({ items }: { items: FaqRow[] }) {
	const router = useRouter();
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function updateFaq(id: string, patch: Partial<FaqRow>) {
		setLoadingId(id);
		setError(null);

		const response = await fetch("/api/admin/faq", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, ...patch }),
		});

		if (!response.ok) {
			const body = (await response.json()) as { error?: string };
			setError(body.error ?? "Could not update FAQ item.");
			setLoadingId(null);
			return;
		}

		setLoadingId(null);
		router.refresh();
	}

	async function deleteFaq(id: string) {
		setLoadingId(id);
		setError(null);

		const response = await fetch("/api/admin/faq", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});

		if (!response.ok) {
			const body = (await response.json()) as { error?: string };
			setError(body.error ?? "Could not delete FAQ item.");
			setLoadingId(null);
			return;
		}

		setLoadingId(null);
		router.refresh();
	}

	return (
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
					{items.map((item) => (
						<tr key={item.id} className="border-b">
							<td className="px-4 py-3">{item.question_en}</td>
							<td className="px-4 py-3">{item.question_id}</td>
							<td className="px-4 py-3">
								<Input
									type="number"
									defaultValue={item.order_index}
									className="h-9 max-w-20"
									onBlur={(event) => updateFaq(item.id, { order_index: Number(event.currentTarget.value) })}
								/>
							</td>
							<td className="px-4 py-3">
								<input
									type="checkbox"
									defaultChecked={item.is_visible}
									className="size-4"
									onChange={(event) => updateFaq(item.id, { is_visible: event.currentTarget.checked })}
								/>
							</td>
							<td className="px-4 py-3">
								<Button size="sm" variant="destructive" onClick={() => deleteFaq(item.id)} disabled={loadingId === item.id}>
									Delete
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{error && <p className="px-4 py-3 text-sm text-(--danger)">{error}</p>}
		</div>
	);
}
