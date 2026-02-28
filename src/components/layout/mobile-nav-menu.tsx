"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import { NavLinks } from "@/components/layout/nav-links";
import { NavbarMessages } from "@/components/layout/navbar-messages";
import { NavbarNotifications } from "@/components/layout/navbar-notifications";
import { PreferenceControls } from "@/components/layout/preference-controls";
import type { SiteNavLink } from "@/lib/types";

interface MobileNavMenuProps {
	enableSignup: boolean;
	isAuthenticated: boolean;
	loginLabel: string;
	menuLabel: string;
	navbarLinks: SiteNavLink[];
	signupLabel: string;
	userId: string | null;
}

export function MobileNavMenu({
	enableSignup,
	isAuthenticated,
	loginLabel,
	menuLabel,
	navbarLinks,
	signupLabel,
	userId,
}: MobileNavMenuProps) {
	const pathname = usePathname();
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const previousPathRef = useRef(pathname);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) return;

		function onMouseDown(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			setOpen(false);
			triggerRef.current?.focus();
		}

		document.addEventListener("mousedown", onMouseDown);
		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.removeEventListener("mousedown", onMouseDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	useEffect(() => {
		if (previousPathRef.current !== pathname) {
			setOpen(false);
			previousPathRef.current = pathname;
		}
	}, [pathname]);

	function onToggleMenu() {
		setOpen((current) => !current);
	}

	function onNavClickCapture(event: ReactMouseEvent<HTMLElement>) {
		const target = event.target as HTMLElement | null;
		if (!target) return;
		if (target.closest("a")) {
			setOpen(false);
		}
	}

	return (
		<div ref={rootRef} className="relative">
			<button
				ref={triggerRef}
				type="button"
				onClick={onToggleMenu}
				aria-label={menuLabel}
				aria-expanded={open}
				aria-haspopup="menu"
				className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-foreground"
			>
				<Menu size={18} />
			</button>

			{open ? (
				<div role="menu" className="absolute right-0 top-11 z-50 w-72 rounded-xl border bg-(--surface-elevated) p-4">
					<div className="mb-3">
						<PreferenceControls />
					</div>
					{isAuthenticated && userId ? (
						<div className="mb-3">
							<div className="mb-2" onClickCapture={onNavClickCapture}>
								<NavbarMessages userId={userId} mobile />
							</div>
							<NavbarNotifications userId={userId} mobile />
						</div>
					) : null}
					<nav className="grid gap-2 text-sm" onClickCapture={onNavClickCapture}>
						<NavLinks baseLinks={navbarLinks} mobile />
					</nav>

					{!isAuthenticated ? (
						<div className="mt-3 border-t border-(--border) pt-3">
							<div className="grid gap-2" style={{ gridTemplateColumns: enableSignup ? "1fr 1fr" : "1fr" }}>
								<Link
									href="/login"
									onClick={() => setOpen(false)}
									className="rounded-lg border px-3 py-2 text-center text-sm font-semibold"
								>
									{loginLabel}
								</Link>
								{enableSignup ? (
									<Link
										href="/signup"
										onClick={() => setOpen(false)}
										className="rounded-lg bg-(--espresso) px-3 py-2 text-center text-sm font-semibold text-(--surface-elevated)"
									>
										{signupLabel}
									</Link>
								) : null}
							</div>
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}
