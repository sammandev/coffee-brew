"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isManagedTabIconUrl, resolveTabIconUrl } from "@/lib/tab-icons";
import type { SiteSettings } from "@/lib/types";

interface SiteSettingsFormProps {
	settings: SiteSettings;
}

type TabIconMode = "upload" | "url";

function prettyJson(value: unknown) {
	return JSON.stringify(value, null, 2);
}

function isValidIconUrl(value: string) {
	if (value.startsWith("/")) return true;
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export function SiteSettingsForm({ settings }: SiteSettingsFormProps) {
	const { locale } = useAppPreferences();
	const router = useRouter();
	const [isSaving, setIsSaving] = useState(false);
	const [isUploadingIcon, setIsUploadingIcon] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [iconError, setIconError] = useState<string | null>(null);

	const initialIconUrl = settings.tab_icon_url ?? "";
	const initialIconMode: TabIconMode = isManagedTabIconUrl(initialIconUrl) ? "upload" : "url";
	const [tabIconMode, setTabIconMode] = useState<TabIconMode>(initialIconMode);
	const [tabIconUrlInput, setTabIconUrlInput] = useState(initialIconMode === "url" ? initialIconUrl : "");
	const [uploadedTabIconUrl, setUploadedTabIconUrl] = useState(initialIconMode === "upload" ? initialIconUrl : "");
	const [uploadedTabIconStoragePath, setUploadedTabIconStoragePath] = useState(settings.tab_icon_storage_path ?? "");

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

	async function uploadTabIcon(file: File) {
		setIsUploadingIcon(true);
		setIconError(null);

		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch("/api/superuser/settings/tab-icon", {
			method: "POST",
			body: formData,
		}).catch(() => null);

		if (!response?.ok) {
			const body = response ? ((await response.json().catch(() => ({}))) as { error?: string }) : null;
			setIconError(body?.error ?? (locale === "id" ? "Gagal mengunggah ikon tab." : "Could not upload tab icon."));
			setIsUploadingIcon(false);
			return;
		}

		const body = (await response.json().catch(() => ({}))) as {
			tab_icon_storage_path?: string;
			tab_icon_url?: string;
		};

		if (!body.tab_icon_url || !body.tab_icon_storage_path) {
			setIconError(locale === "id" ? "Respons upload ikon tidak valid." : "Invalid tab icon upload response.");
			setIsUploadingIcon(false);
			return;
		}

		setUploadedTabIconUrl(body.tab_icon_url);
		setUploadedTabIconStoragePath(body.tab_icon_storage_path);
		setTabIconMode("upload");
		setTabIconUrlInput("");
		setIsUploadingIcon(false);
	}

	function clearTabIcon() {
		setUploadedTabIconUrl("");
		setUploadedTabIconStoragePath("");
		setTabIconUrlInput("");
		setTabIconMode("url");
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSuccess(null);
		setIconError(null);
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

		const selectedUploadUrl = uploadedTabIconUrl.trim();
		const selectedUploadPath = uploadedTabIconStoragePath.trim();
		const selectedExternalUrl = tabIconUrlInput.trim();
		let resolvedTabIconUrl: string | null = null;
		let resolvedTabIconPath: string | null = null;

		if (tabIconMode === "upload") {
			if (selectedUploadUrl.length > 0) {
				resolvedTabIconUrl = selectedUploadUrl;
				resolvedTabIconPath = selectedUploadPath || null;
			}
		} else if (selectedExternalUrl.length > 0) {
			if (!isValidIconUrl(selectedExternalUrl)) {
				setIconError(locale === "id" ? "URL ikon tab tidak valid." : "Tab icon URL is invalid.");
				setIsSaving(false);
				return;
			}
			resolvedTabIconUrl = selectedExternalUrl;
			resolvedTabIconPath = null;
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
			tab_icon_url: resolvedTabIconUrl,
			tab_icon_storage_path: resolvedTabIconPath,
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

	const previewTabIcon = resolveTabIconUrl(
		tabIconMode === "upload" ? uploadedTabIconUrl || null : tabIconUrlInput.trim() || null,
	);
	const hasCustomTabIcon = previewTabIcon !== "/coffee-brew-mark.svg";

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

			<section className="space-y-3 rounded-2xl border bg-(--surface) p-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h3 className="font-heading text-xl text-(--espresso)">
							{locale === "id" ? "Ikon Tab Aplikasi" : "Application Tab Icon"}
						</h3>
						<p className="text-xs text-(--muted)">
							{locale === "id"
								? "Pilih satu sumber ikon: unggah file atau gunakan URL."
								: "Choose a single icon source: upload a file or use a URL."}
						</p>
					</div>
					<div className="inline-flex rounded-lg border bg-(--surface-elevated) p-1">
						<button
							type="button"
							onClick={() => {
								setTabIconMode("upload");
								setTabIconUrlInput("");
							}}
							className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tabIconMode === "upload" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
						>
							Upload
						</button>
						<button
							type="button"
							onClick={() => {
								setTabIconMode("url");
								setUploadedTabIconUrl("");
								setUploadedTabIconStoragePath("");
							}}
							className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tabIconMode === "url" ? "bg-(--espresso) text-(--surface-elevated)" : "text-(--muted)"}`}
						>
							URL
						</button>
					</div>
				</div>

				{tabIconMode === "upload" ? (
					<div className="space-y-2">
						<label className="inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-semibold hover:bg-(--sand)/15">
							<input
								type="file"
								accept="image/png,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
								className="hidden"
								onChange={(event) => {
									const file = event.currentTarget.files?.[0];
									event.currentTarget.value = "";
									if (!file) return;
									void uploadTabIcon(file);
								}}
								disabled={isUploadingIcon || isSaving}
							/>
							{isUploadingIcon
								? locale === "id"
									? "Mengunggah..."
									: "Uploading..."
								: locale === "id"
									? "Unggah Ikon"
									: "Upload Icon"}
						</label>
						<p className="text-xs text-(--muted)">
							{locale === "id" ? "PNG/WEBP/SVG/ICO hingga 2MB." : "PNG/WEBP/SVG/ICO up to 2MB."}
						</p>
					</div>
				) : (
					<div className="space-y-2">
						<Label htmlFor="tab-icon-url">{locale === "id" ? "URL Ikon Tab" : "Tab Icon URL"}</Label>
						<Input
							id="tab-icon-url"
							value={tabIconUrlInput}
							onChange={(event) => setTabIconUrlInput(event.currentTarget.value)}
							placeholder="https://..."
						/>
					</div>
				)}

				<div className="flex items-center gap-3 rounded-xl border bg-(--surface-elevated) p-3">
					{/* biome-ignore lint/performance/noImgElement: settings preview supports arbitrary external icon URLs */}
					<img
						src={previewTabIcon}
						alt="Tab icon preview"
						className="h-10 w-10 rounded-md border bg-white object-contain p-1"
					/>
					<div className="min-w-0">
						<p className="truncate text-xs text-(--muted)">{previewTabIcon}</p>
						{hasCustomTabIcon ? (
							<button type="button" onClick={clearTabIcon} className="mt-1 text-xs font-semibold text-(--danger)">
								{locale === "id" ? "Hapus Ikon Tab" : "Remove Tab Icon"}
							</button>
						) : null}
					</div>
				</div>

				{iconError ? <p className="text-sm text-(--danger)">{iconError}</p> : null}
			</section>

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

			<div className="grid gap-3">
				<div className="flex items-center gap-2 text-sm">
					<Checkbox
						checked={form.enable_google_login}
						onChange={(event) => updateField("enable_google_login", event.currentTarget.checked)}
					/>
					Enable Google Login
				</div>
				<div className="flex items-center gap-2 text-sm">
					<Checkbox
						checked={form.enable_magic_link_login}
						onChange={(event) => updateField("enable_magic_link_login", event.currentTarget.checked)}
					/>
					Enable Magic Link Login
				</div>
				<div className="flex items-center gap-2 text-sm">
					<Checkbox
						checked={form.enable_signup}
						onChange={(event) => updateField("enable_signup", event.currentTarget.checked)}
					/>
					Enable Registration (Sign Up)
				</div>
			</div>

			{error && <p className="text-sm text-(--danger)">{error}</p>}
			{success && <p className="text-sm text-(--accent)">{success}</p>}

			<div className="flex justify-end">
				<Button type="submit" disabled={isSaving || isUploadingIcon}>
					{isSaving ? (locale === "id" ? "Menyimpan..." : "Saving...") : locale === "id" ? "Simpan" : "Save"}
				</Button>
			</div>
		</form>
	);
}
