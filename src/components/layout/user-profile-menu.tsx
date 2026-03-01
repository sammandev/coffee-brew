"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface UserProfileMenuProps {
	accountRole: Role;
	avatarUrl: string | null;
	displayName: string;
	email: string;
	labels: {
		dashboard: string;
		profileSettings: string;
		signOut: string;
	};
	mobile?: boolean;
	mobilePanelClassName?: string;
	mobilePanelMode?: "inline" | "viewport";
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

function resolveRoleLabel(role: Role) {
	if (role === "superuser") return "Superuser";
	if (role === "admin") return "Admin";
	return "User";
}

export function UserProfileMenu({
	accountRole,
	avatarUrl,
	displayName,
	email,
	labels,
	mobile = false,
	mobilePanelClassName,
	mobilePanelMode = "inline",
}: UserProfileMenuProps) {
	const pathname = usePathname();
	const router = useRouter();
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const previousPathRef = useRef(pathname);
	const [open, setOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const firstWord = resolveFirstWord(displayName);
	const initial = resolveInitial(displayName);
	const dashboardPath = resolveDashboardPath(accountRole);
	const profileSettingsPath = resolveProfileSettingsPath(accountRole);
	const viewportPanel = mobilePanelMode === "viewport";

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
		if (previousPathRef.current !== pathname) {
			setOpen(false);
			previousPathRef.current = pathname;
		}
	}, [pathname]);

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
				<>
					{viewportPanel ? (
						<button
							type="button"
							className="fixed inset-0 z-110 bg-(--overlay)/35 lg:hidden"
							onClick={() => setOpen(false)}
							aria-label="Close profile menu"
						/>
					) : null}

					<div
						role="menu"
						className={cn(
							"rounded-xl border bg-(--surface-elevated) p-3 shadow-[0_14px_32px_-20px_var(--overlay)]",
							viewportPanel
								? "fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] z-120 max-h-[calc(100dvh-5rem)] overflow-y-auto"
								: mobile
									? "mt-2 w-full"
									: "absolute right-0 top-11 z-80 w-[calc(100vw-2rem)] max-w-72",
							mobilePanelClassName,
						)}
					>
						<div className="flex items-center gap-2">
							<span className="inline-flex rounded-full border bg-(--surface) px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-(--muted)">
								{resolveRoleLabel(accountRole)}
							</span>
							<p className="text-sm font-semibold text-(--espresso)">{displayName}</p>
						</div>
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
				</>
			) : null}
		</div>
	);
}
