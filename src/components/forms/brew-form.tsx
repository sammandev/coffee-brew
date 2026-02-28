"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BrewStatus } from "@/lib/types";

interface BrewFormProps {
	mode: "create" | "edit";
	brewId?: string;
	initialValues?: {
		name?: string;
		brew_method?: string;
		coffee_beans?: string;
		brand_roastery?: string;
		water_type?: string;
		water_ppm?: number;
		temperature?: number;
		temperature_unit?: "C" | "F";
		grind_size?: string;
		grind_clicks?: number | null;
		brew_time_seconds?: number;
		brewer_name?: string;
		notes?: string;
		status?: BrewStatus;
	};
}

export function BrewForm({ mode, brewId, initialValues }: BrewFormProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const defaults = useMemo(
		() => ({
			name: initialValues?.name ?? "",
			brewMethod: initialValues?.brew_method ?? "Pour Over",
			coffeeBeans: initialValues?.coffee_beans ?? "",
			brandRoastery: initialValues?.brand_roastery ?? "",
			waterType: initialValues?.water_type ?? "Filtered",
			waterPpm: initialValues?.water_ppm ?? 120,
			temperature: initialValues?.temperature ?? 93,
			temperatureUnit: initialValues?.temperature_unit ?? "C",
			grindSize: initialValues?.grind_size ?? "Medium",
			grindClicks: initialValues?.grind_clicks ?? "",
			brewTimeSeconds: initialValues?.brew_time_seconds ?? 180,
			brewerName: initialValues?.brewer_name ?? "",
			notes: initialValues?.notes ?? "",
			status: initialValues?.status ?? "draft",
		}),
		[initialValues],
	);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		setError(null);

		const formData = new FormData(event.currentTarget);

		const payload = {
			name: String(formData.get("name") ?? ""),
			brewMethod: String(formData.get("brewMethod") ?? ""),
			coffeeBeans: String(formData.get("coffeeBeans") ?? ""),
			brandRoastery: String(formData.get("brandRoastery") ?? ""),
			waterType: String(formData.get("waterType") ?? ""),
			waterPpm: Number(formData.get("waterPpm") ?? 0),
			temperature: Number(formData.get("temperature") ?? 0),
			temperatureUnit: String(formData.get("temperatureUnit") ?? "C"),
			grindSize: String(formData.get("grindSize") ?? ""),
			grindClicks: formData.get("grindClicks") ? Number(formData.get("grindClicks")) : null,
			brewTimeSeconds: Number(formData.get("brewTimeSeconds") ?? 0),
			brewerName: String(formData.get("brewerName") ?? ""),
			notes: String(formData.get("notes") ?? ""),
			status: String(formData.get("status") ?? "draft"),
		};

		const response = await fetch(mode === "create" ? "/api/brews" : `/api/brews/${brewId}`, {
			method: mode === "create" ? "POST" : "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const body = (await response.json()) as { error?: string };
			setError(body.error ?? "Unable to save brew");
			setIsSubmitting(false);
			return;
		}

		router.push("/dashboard");
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border bg-[var(--surface-elevated)] p-6">
			<div className="grid gap-2">
				<Label htmlFor="name">{locale === "id" ? "Nama Racikan" : "Brew Name"}</Label>
				<Input id="name" name="name" defaultValue={defaults.name} required />
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor="brewMethod">{locale === "id" ? "Metode Seduh" : "Brew Method"}</Label>
					<Input id="brewMethod" name="brewMethod" defaultValue={defaults.brewMethod} required />
				</div>
				<div>
					<Label htmlFor="brewerName">{locale === "id" ? "Nama Brewer" : "Brewer Name"}</Label>
					<Input id="brewerName" name="brewerName" defaultValue={defaults.brewerName} required />
				</div>
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor="coffeeBeans">{locale === "id" ? "Biji Kopi" : "Coffee Beans"}</Label>
					<Input id="coffeeBeans" name="coffeeBeans" defaultValue={defaults.coffeeBeans} required />
				</div>
				<div>
					<Label htmlFor="brandRoastery">{locale === "id" ? "Merek / Roastery" : "Brand / Roastery"}</Label>
					<Input id="brandRoastery" name="brandRoastery" defaultValue={defaults.brandRoastery} required />
				</div>
			</div>
			<div className="grid gap-4 md:grid-cols-3">
				<div>
					<Label htmlFor="waterType">{locale === "id" ? "Jenis Air" : "Water Type"}</Label>
					<Input id="waterType" name="waterType" defaultValue={defaults.waterType} required />
				</div>
				<div>
					<Label htmlFor="waterPpm">Water PPM</Label>
					<Input id="waterPpm" name="waterPpm" type="number" defaultValue={defaults.waterPpm} required />
				</div>
				<div>
					<Label htmlFor="temperature">{locale === "id" ? "Suhu" : "Temperature"}</Label>
					<Input id="temperature" name="temperature" type="number" step="0.1" defaultValue={defaults.temperature} required />
				</div>
			</div>
			<div className="grid gap-4 md:grid-cols-3">
				<div>
					<Label htmlFor="temperatureUnit">{locale === "id" ? "Unit Suhu" : "Temp Unit"}</Label>
					<Select id="temperatureUnit" name="temperatureUnit" defaultValue={defaults.temperatureUnit}>
						<option value="C">Celsius</option>
						<option value="F">Fahrenheit</option>
					</Select>
				</div>
				<div>
					<Label htmlFor="grindSize">{locale === "id" ? "Ukuran Giling" : "Grind Size"}</Label>
					<Input id="grindSize" name="grindSize" defaultValue={defaults.grindSize} required />
				</div>
				<div>
					<Label htmlFor="grindClicks">{locale === "id" ? "Klik Grinder (Opsional)" : "Grind Clicks (Optional)"}</Label>
					<Input id="grindClicks" name="grindClicks" type="number" defaultValue={defaults.grindClicks || ""} />
				</div>
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor="brewTimeSeconds">{locale === "id" ? "Waktu Seduh (Detik)" : "Brew Time (Seconds)"}</Label>
					<Input
						id="brewTimeSeconds"
						name="brewTimeSeconds"
						type="number"
						defaultValue={defaults.brewTimeSeconds}
						required
					/>
				</div>
				<div>
					<Label htmlFor="status">Status</Label>
					<Select id="status" name="status" defaultValue={defaults.status}>
						<option value="draft">{locale === "id" ? "Draft" : "Draft"}</option>
						<option value="published">{locale === "id" ? "Publik" : "Published"}</option>
						<option value="hidden">{locale === "id" ? "Disembunyikan" : "Hidden"}</option>
					</Select>
				</div>
			</div>
			<div className="grid gap-2">
				<Label htmlFor="notes">{locale === "id" ? "Catatan" : "Notes"}</Label>
				<Textarea id="notes" name="notes" defaultValue={defaults.notes} />
			</div>
			{error && <p className="text-sm text-[var(--danger)]">{error}</p>}
			<div className="flex items-center justify-end gap-3">
				<Button type="button" variant="ghost" onClick={() => router.back()}>
					{locale === "id" ? "Batal" : "Cancel"}
				</Button>
				<Button disabled={isSubmitting} type="submit">
					{isSubmitting
						? locale === "id"
							? "Menyimpan..."
							: "Saving..."
						: mode === "create"
							? locale === "id"
								? "Buat Racikan"
								: "Create Brew"
							: locale === "id"
								? "Perbarui Racikan"
								: "Update Brew"}
				</Button>
			</div>
		</form>
	);
}
