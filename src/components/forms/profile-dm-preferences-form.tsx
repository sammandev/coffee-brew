"use client";

import { Loader2, ShieldAlert, UserMinus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface ProfileDmPreferencesFormProps {
	initialDmPrivacy: "everyone" | "verified_only" | "nobody";
}

interface MentionResult {
	id: string;
	mention_handle: string;
	display_name: string | null;
	email: string | null;
}

interface BlockedUserRow {
	id: string;
	created_at: string;
	profile: {
		id: string;
		display_name: string;
		email: string | null;
		avatar_url: string | null;
		mention_handle: string | null;
		is_verified: boolean;
	} | null;
}

export function ProfileDmPreferencesForm({ initialDmPrivacy }: ProfileDmPreferencesFormProps) {
	const { locale } = useAppPreferences();
	const [dmPrivacy, setDmPrivacy] = useState(initialDmPrivacy);
	const [savingPrivacy, setSavingPrivacy] = useState(false);
	const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
	const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
	const [loadingBlocks, setLoadingBlocks] = useState(true);
	const [blockedUsers, setBlockedUsers] = useState<BlockedUserRow[]>([]);
	const [query, setQuery] = useState("");
	const [searching, setSearching] = useState(false);
	const [results, setResults] = useState<MentionResult[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const copy = useMemo(
		() => ({
			title: locale === "id" ? "Privasi Direct Message" : "Direct Message Privacy",
			description:
				locale === "id"
					? "Atur siapa yang dapat memulai pesan langsung dan kelola daftar blokir."
					: "Control who can start direct messages and manage your blocked users.",
			everyone: locale === "id" ? "Semua pengguna terautentikasi" : "Everyone (authenticated users)",
			verifiedOnly: locale === "id" ? "Hanya pengguna terverifikasi" : "Verified users only",
			nobody: locale === "id" ? "Tidak ada" : "Nobody",
			save: locale === "id" ? "Simpan Pengaturan DM" : "Save DM Settings",
			searchPlaceholder: locale === "id" ? "Cari @handle atau nama..." : "Search @handle or name...",
			block: locale === "id" ? "Blokir" : "Block",
			blockedTitle: locale === "id" ? "Daftar Pengguna Diblokir" : "Blocked Users",
			noBlocked: locale === "id" ? "Belum ada pengguna yang diblokir." : "No blocked users yet.",
			unblock: locale === "id" ? "Buka Blokir" : "Unblock",
		}),
		[locale],
	);

	const loadBlockedUsers = useCallback(async () => {
		setLoadingBlocks(true);
		const response = await fetch("/api/messages/blocks", { method: "GET" }).catch(() => null);
		if (!response?.ok) {
			setBlockedUsers([]);
			setLoadingBlocks(false);
			return;
		}
		const body = (await response.json().catch(() => ({}))) as { blocked_users?: BlockedUserRow[] };
		setBlockedUsers(Array.isArray(body.blocked_users) ? body.blocked_users : []);
		setLoadingBlocks(false);
	}, []);

	useEffect(() => {
		void loadBlockedUsers();
	}, [loadBlockedUsers]);

	async function savePrivacy() {
		setSavingPrivacy(true);
		setError(null);
		setSuccess(null);
		const response = await fetch("/api/profile", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ dm_privacy: dmPrivacy }),
		}).catch(() => null);
		if (!response?.ok) {
			setError(locale === "id" ? "Gagal menyimpan pengaturan DM." : "Could not save DM settings.");
			setSavingPrivacy(false);
			return;
		}
		setSuccess(locale === "id" ? "Pengaturan DM berhasil disimpan." : "DM settings saved.");
		setSavingPrivacy(false);
	}

	async function searchUsers(nextQuery: string) {
		setQuery(nextQuery);
		const normalized = nextQuery.trim().replace(/^@+/, "");
		if (normalized.length < 1) {
			setResults([]);
			return;
		}
		setSearching(true);
		const response = await fetch(`/api/forum/mentions/search?q=${encodeURIComponent(normalized)}&limit=8`, {
			method: "GET",
		}).catch(() => null);
		if (!response?.ok) {
			setResults([]);
			setSearching(false);
			return;
		}
		const body = (await response.json().catch(() => ({}))) as { users?: MentionResult[] };
		setResults(Array.isArray(body.users) ? body.users : []);
		setSearching(false);
	}

	async function blockUser(userId: string) {
		setBlockingUserId(userId);
		setError(null);
		setSuccess(null);
		const response = await fetch(`/api/messages/blocks/${userId}`, { method: "POST" }).catch(() => null);
		if (!response?.ok) {
			setError(locale === "id" ? "Gagal memblokir pengguna." : "Could not block user.");
			setBlockingUserId(null);
			return;
		}
		setSuccess(locale === "id" ? "Pengguna berhasil diblokir." : "User blocked.");
		setQuery("");
		setResults([]);
		await loadBlockedUsers();
		setBlockingUserId(null);
	}

	async function unblockUser(userId: string) {
		setUnblockingUserId(userId);
		setError(null);
		setSuccess(null);
		const response = await fetch(`/api/messages/blocks/${userId}`, { method: "DELETE" }).catch(() => null);
		if (!response?.ok) {
			setError(locale === "id" ? "Gagal membuka blokir pengguna." : "Could not unblock user.");
			setUnblockingUserId(null);
			return;
		}
		setSuccess(locale === "id" ? "Pengguna berhasil dibuka blokirnya." : "User unblocked.");
		await loadBlockedUsers();
		setUnblockingUserId(null);
	}

	return (
		<Card className="grid gap-4">
			<div>
				<h3 className="font-heading text-xl text-(--espresso)">{copy.title}</h3>
				<p className="mt-1 text-sm text-(--muted)">{copy.description}</p>
			</div>

			<div className="grid gap-3">
				<Label htmlFor="dm-privacy-select">{copy.title}</Label>
				<Select
					id="dm-privacy-select"
					value={dmPrivacy}
					onChange={(event) => setDmPrivacy(event.currentTarget.value as typeof dmPrivacy)}
				>
					<option value="everyone">{copy.everyone}</option>
					<option value="verified_only">{copy.verifiedOnly}</option>
					<option value="nobody">{copy.nobody}</option>
				</Select>
				<Button type="button" onClick={() => void savePrivacy()} disabled={savingPrivacy} className="w-fit">
					{savingPrivacy ? (
						<span className="inline-flex items-center gap-2">
							<Loader2 size={14} className="animate-spin" />
							{copy.save}...
						</span>
					) : (
						copy.save
					)}
				</Button>
			</div>

			<div className="grid gap-2 rounded-2xl border bg-(--surface) p-3">
				<Label htmlFor="dm-block-user-search">{locale === "id" ? "Blokir pengguna" : "Block user"}</Label>
				<div className="flex flex-wrap items-center gap-2">
					<Input
						id="dm-block-user-search"
						value={query}
						onChange={(event) => void searchUsers(event.currentTarget.value)}
						placeholder={copy.searchPlaceholder}
						className="min-w-48 flex-1"
					/>
					{searching ? <Loader2 size={14} className="animate-spin text-(--muted)" /> : null}
				</div>
				{results.length > 0 ? (
					<div className="grid gap-2">
						{results.map((result) => (
							<div
								key={result.id}
								className="flex items-center justify-between rounded-xl border bg-(--surface-elevated) px-3 py-2"
							>
								<p className="text-sm">
									<span className="font-semibold">{result.display_name?.trim() || result.email || result.mention_handle}</span>{" "}
									<span className="text-(--muted)">@{result.mention_handle}</span>
								</p>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => void blockUser(result.id)}
									disabled={blockingUserId === result.id}
								>
									{blockingUserId === result.id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
									<span className="ml-1">{copy.block}</span>
								</Button>
							</div>
						))}
					</div>
				) : null}
			</div>

			<div className="grid gap-2">
				<p className="text-sm font-semibold text-(--espresso)">{copy.blockedTitle}</p>
				{loadingBlocks ? (
					<p className="text-sm text-(--muted)">{locale === "id" ? "Memuat..." : "Loading..."}</p>
				) : blockedUsers.length === 0 ? (
					<p className="text-sm text-(--muted)">{copy.noBlocked}</p>
				) : (
					blockedUsers.map((entry) => (
						<div key={entry.id} className="flex items-center justify-between rounded-xl border bg-(--surface) px-3 py-2">
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold">
									{entry.profile?.display_name || entry.profile?.email || (locale === "id" ? "Pengguna" : "User")}
								</p>
								<p className="truncate text-xs text-(--muted)">
									{entry.profile?.mention_handle ? `@${entry.profile.mention_handle}` : entry.profile?.email || entry.id}
								</p>
							</div>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => void unblockUser(entry.id)}
								disabled={unblockingUserId === entry.id}
							>
								{unblockingUserId === entry.id ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
								<span className="ml-1">{copy.unblock}</span>
							</Button>
						</div>
					))
				)}
			</div>

			{error ? (
				<p className="inline-flex items-center gap-2 text-sm text-(--danger)">
					<ShieldAlert size={14} />
					{error}
				</p>
			) : null}
			{success ? <p className="text-sm text-(--accent)">{success}</p> : null}
		</Card>
	);
}
