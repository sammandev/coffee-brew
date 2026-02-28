"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface UserProfileMenuProps {
	avatarUrl: string | null;
	displayName: string;
	email: string;
	labels: {
		dashboard: string;
		profileSettings: string;
		signOut: string;
	};
	mobile?: boolean;
	role: Role;
}

function resolveFirstWord(displayName: string) {
	const normalized = displayName.trim();
	if (!normalized) return "User";
	return normalized.split(/\s+/)[0] ?? "User";
}

function resolveInitial(displayName: string) {
	const firstWord = resolveFirstWord(displayName);
	return firstWord.charAt(0).toUpperCase() || "U";
}

function resolveDashboardPath(role: Role) {
	return role === "user" ? "/me" : "/dashboard";
}

function resolveProfileSettingsPath(role: Role) {
	if (role === "user") {
		return "/me/profile";
	}

	return "/dashboard/profile";
}

export function UserProfileMenu({ avatarUrl, displayName, email, labels, mobile = false, role }: UserProfileMenuProps) {
	const _pathname = usePathname();
	const router = useRouter();
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const firstWord = resolveFirstWord(displayName);
	const initial = resolveInitial(displayName);
	const dashboardPath = resolveDashboardPath(role);
	const profileSettingsPath = resolveProfileSettingsPath(role);

	useEffect(() => {
		if (!open) return;

		function handleOutsideMouseDown(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			setOpen(false);
			triggerRef.current?.focus();
		}

		document.addEventListener("mousedown", handleOutsideMouseDown);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("mousedown", handleOutsideMouseDown);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [open]);

	useEffect(() => {
		setOpen(false);
	}, []);

	async function signOut() {
		if (isSigningOut) return;
		setIsSigningOut(true);

		await fetch("/api/auth/signout", {
			method: "POST",
		}).catch(() => null);

		setOpen(false);
		setIsSigningOut(false);
		router.push("/");
		router.refresh();
	}

	return (
		<div ref={rootRef} className={cn("relative", mobile && "w-full")}>
			<button
				ref={triggerRef}
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
				className={cn(
					"inline-flex h-9 items-center gap-2 rounded-lg border border-(--border) bg-(--surface) px-2 text-foreground transition hover:bg-(--sand)/15",
					mobile && "w-full justify-start",
				)}
			>
				<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--sand)/20 text-xs font-semibold text-(--espresso)">
					{avatarUrl ? (
						<Image src={avatarUrl} alt={displayName} width={24} height={24} className="h-full w-full object-cover" />
					) : (
						initial
					)}
				</span>
				<span className="max-w-20 truncate text-sm font-semibold leading-none">{firstWord}</span>
			</button>

			{open ? (
				<div
					role="menu"
					className={cn(
						"rounded-xl border bg-(--surface-elevated) p-3 shadow-[0_14px_32px_-20px_var(--overlay)]",
						mobile ? "mt-2 w-full" : "absolute right-0 top-11 z-80 w-72",
					)}
				>
					<p className="text-sm font-semibold text-(--espresso)">
						{role.toUpperCase()} {displayName}
					</p>
					<p className="mt-1 break-all text-xs text-(--muted)">{email}</p>

					<div className="my-3 border-t border-(--border)" />

					<div className="grid gap-1">
						<Link
							href={dashboardPath}
							onClick={() => setOpen(false)}
							className="rounded-md px-2 py-1.5 text-sm transition hover:bg-(--sand)/20"
						>
							{labels.dashboard}
						</Link>
						<Link
							href={profileSettingsPath}
							onClick={() => setOpen(false)}
							className="rounded-md px-2 py-1.5 text-sm transition hover:bg-(--sand)/20"
						>
							{labels.profileSettings}
						</Link>
					</div>

					<div className="my-3 border-t border-(--border)" />

					<button
						type="button"
						onClick={signOut}
						disabled={isSigningOut}
						className="w-full rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-(--sand)/20 disabled:opacity-60"
					>
						{isSigningOut ? `${labels.signOut}...` : labels.signOut}
					</button>
				</div>
			) : null}
		</div>
	);
}
