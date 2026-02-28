"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NavbarNotifications } from "@/components/layout/navbar-notifications";
import { PreferenceControls } from "@/components/layout/preference-controls";

interface DashboardMobileMenuProps {
	locale: "en" | "id";
	userId: string;
}

export function DashboardMobileMenu({ locale, userId }: DashboardMobileMenuProps) {
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

	return (
		<div ref={rootRef} className="relative">
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen((current) => !current)}
				aria-label={locale === "id" ? "Menu dashboard" : "Dashboard menu"}
				aria-expanded={open}
				aria-haspopup="menu"
				className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-foreground"
			>
				<Menu size={18} />
			</button>

			{open ? (
				<>
					<button
						type="button"
						className="fixed inset-0 z-[110] bg-(--overlay)/35 lg:hidden"
						onClick={() => setOpen(false)}
						aria-label={locale === "id" ? "Tutup menu dashboard" : "Close dashboard menu"}
					/>
					<div
						role="menu"
						className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] z-[120] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl border bg-(--surface-elevated) p-4"
					>
						<div className="mb-3">
							<PreferenceControls />
						</div>
						<div className="mb-3">
							<NavbarNotifications userId={userId} mobile />
						</div>
						<div className="border-t border-(--border) pt-3">
							<Link
								href="/"
								onClick={() => setOpen(false)}
								className="inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-semibold"
							>
								{locale === "id" ? "Ke situs publik" : "Public site"}
							</Link>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
