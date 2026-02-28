"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SiteSettings } from "@/lib/types";

interface SiteSettingsFormProps {
	settings: SiteSettings;
}

function prettyJson(value: unknown) {
	return JSON.stringify(value, null, 2);
}

export function SiteSettingsForm({ settings }: SiteSettingsFormProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [form, setForm] = useState({
		app_name: settings.app_name,
		tab_title: settings.tab_title,
		home_title_en: settings.home_title_en ?? "",
		home_title_id: settings.home_title_id ?? "",
		home_subtitle_en: settings.home_subtitle_en ?? "",
		home_subtitle_id: settings.home_subtitle_id ?? "",
		footer_tagline_en: settings.footer_tagline_en,
		footer_tagline_id: settings.footer_tagline_id,
		footer_description_en: settings.footer_description_en,
		footer_description_id: settings.footer_description_id,
		enable_google_login: settings.enable_google_login,
		enable_magic_link_login: settings.enable_magic_link_login,
		enable_signup: settings.enable_signup,
		navbar_links: prettyJson(settings.navbar_links),
		footer_links: prettyJson(settings.footer_links),
	});

	const tips = useMemo(
		() => ({
			navbar:
				locale === "id"
					? "JSON array: href, label_en, label_id, is_visible"
					: "JSON array: href, label_en, label_id, is_visible",
			footer:
				locale === "id"
					? "JSON array: group (sitemap/community/support), href, label_en, label_id, is_visible"
					: "JSON array: group (sitemap/community/support), href, label_en, label_id, is_visible",
		}),
		[locale],
	);

	function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSuccess(null);
		setIsSaving(true);

		let navbarLinks: unknown;
		let footerLinks: unknown;

		try {
			navbarLinks = JSON.parse(form.navbar_links);
		} catch {
			setError(locale === "id" ? "Format JSON navbar tidak valid." : "Navbar JSON format is invalid.");
			setIsSaving(false);
			return;
		}

		try {
			footerLinks = JSON.parse(form.footer_links);
		} catch {
			setError(locale === "id" ? "Format JSON footer tidak valid." : "Footer JSON format is invalid.");
			setIsSaving(false);
			return;
		}

		const payload = {
			app_name: form.app_name,
			tab_title: form.tab_title,
			home_title_en: form.home_title_en || null,
			home_title_id: form.home_title_id || null,
			home_subtitle_en: form.home_subtitle_en || null,
			home_subtitle_id: form.home_subtitle_id || null,
			navbar_links: navbarLinks,
			footer_tagline_en: form.footer_tagline_en,
			footer_tagline_id: form.footer_tagline_id,
			footer_description_en: form.footer_description_en,
			footer_description_id: form.footer_description_id,
			footer_links: footerLinks,
			enable_google_login: form.enable_google_login,
			enable_magic_link_login: form.enable_magic_link_login,
			enable_signup: form.enable_signup,
		};

		const response = await fetch("/api/superuser/settings", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json()) as { error?: string }) : null;
			setError(body?.error ?? (locale === "id" ? "Gagal menyimpan pengaturan." : "Could not save settings."));
			setIsSaving(false);
			return;
		}

		setSuccess(locale === "id" ? "Pengaturan berhasil disimpan." : "Settings saved successfully.");
		setIsSaving(false);
		router.refresh();
	}

	return (
		<form onSubmit={onSubmit} className="grid gap-5 rounded-3xl border bg-(--surface-elevated) p-6">
			<h2 className="font-heading text-2xl text-(--espresso)">
				{locale === "id" ? "Pengaturan Aplikasi" : "Application Settings"}
			</h2>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor="app_name">App Name</Label>
					<Input
						id="app_name"
						value={form.app_name}
						onChange={(event) => updateField("app_name", event.currentTarget.value)}
					/>
				</div>
				<div>
					<Label htmlFor="tab_title">Tab Title</Label>
					<Input
						id="tab_title"
						value={form.tab_title}
						onChange={(event) => updateField("tab_title", event.currentTarget.value)}
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor="home_title_en">Home Page Title (EN)</Label>
					<Input
						id="home_title_en"
						value={form.home_title_en}
						onChange={(event) => updateField("home_title_en", event.currentTarget.value)}
					/>
				</div>
				<div>
					<Label htmlFor="home_title_id">Home Page Title (ID)</Label>
					<Input
						id="home_title_id"
						value={form.home_title_id}
						onChange={(event) => updateField("home_title_id", event.currentTarget.value)}
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor="home_subtitle_en">Home Subtitle (EN)</Label>
					<Textarea
						id="home_subtitle_en"
						value={form.home_subtitle_en}
						onChange={(event) => updateField("home_subtitle_en", event.currentTarget.value)}
					/>
				</div>
				<div>
					<Label htmlFor="home_subtitle_id">Home Subtitle (ID)</Label>
					<Textarea
						id="home_subtitle_id"
						value={form.home_subtitle_id}
						onChange={(event) => updateField("home_subtitle_id", event.currentTarget.value)}
					/>
				</div>
			</div>

			<div>
				<Label htmlFor="navbar_links">Navbar Links JSON</Label>
				<p className="mb-2 text-xs text-(--muted)">{tips.navbar}</p>
				<Textarea
					id="navbar_links"
					value={form.navbar_links}
					onChange={(event) => updateField("navbar_links", event.currentTarget.value)}
					className="min-h-44 font-mono text-xs"
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor="footer_tagline_en">Footer Tagline (EN)</Label>
					<Input
						id="footer_tagline_en"
						value={form.footer_tagline_en}
						onChange={(event) => updateField("footer_tagline_en", event.currentTarget.value)}
					/>
				</div>
				<div>
					<Label htmlFor="footer_tagline_id">Footer Tagline (ID)</Label>
					<Input
						id="footer_tagline_id"
						value={form.footer_tagline_id}
						onChange={(event) => updateField("footer_tagline_id", event.currentTarget.value)}
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div>
					<Label htmlFor="footer_description_en">Footer Description (EN)</Label>
					<Textarea
						id="footer_description_en"
						value={form.footer_description_en}
						onChange={(event) => updateField("footer_description_en", event.currentTarget.value)}
					/>
				</div>
				<div>
					<Label htmlFor="footer_description_id">Footer Description (ID)</Label>
					<Textarea
						id="footer_description_id"
						value={form.footer_description_id}
						onChange={(event) => updateField("footer_description_id", event.currentTarget.value)}
					/>
				</div>
			</div>

			<div>
				<Label htmlFor="footer_links">Footer Links JSON</Label>
				<p className="mb-2 text-xs text-(--muted)">{tips.footer}</p>
				<Textarea
					id="footer_links"
					value={form.footer_links}
					onChange={(event) => updateField("footer_links", event.currentTarget.value)}
					className="min-h-44 font-mono text-xs"
				/>
			</div>

			<div className="grid gap-2">
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={form.enable_google_login}
						onChange={(event) => updateField("enable_google_login", event.currentTarget.checked)}
					/>
					Enable Google Login
				</label>
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={form.enable_magic_link_login}
						onChange={(event) => updateField("enable_magic_link_login", event.currentTarget.checked)}
					/>
					Enable Magic Link Login
				</label>
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={form.enable_signup}
						onChange={(event) => updateField("enable_signup", event.currentTarget.checked)}
					/>
					Enable Registration (Sign Up)
				</label>
			</div>

			{error && <p className="text-sm text-(--danger)">{error}</p>}
			{success && <p className="text-sm text-(--accent)">{success}</p>}

			<div className="flex justify-end">
				<Button type="submit" disabled={isSaving}>
					{isSaving ? (locale === "id" ? "Menyimpan..." : "Saving...") : locale === "id" ? "Simpan" : "Save"}
				</Button>
			</div>
		</form>
	);
}
