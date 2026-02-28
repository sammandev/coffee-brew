import { cn } from "@/lib/utils";

export function isActivePath(pathname: string, href: string) {
	if (href === "/") {
		return pathname === "/";
	}

	return pathname === href || pathname.startsWith(`${href}/`);
}

export function navItemClassName(isActive: boolean, mobile = false) {
	return cn(
		mobile
			? "rounded-xl px-3 py-2 hover:bg-[var(--sand)]/20"
			: "rounded-full px-3 py-2 transition-colors hover:text-[var(--accent)]",
		isActive &&
			(mobile
				? "bg-[var(--sand)]/30 font-semibold text-[var(--espresso)]"
				: "bg-[var(--sand)]/25 font-semibold text-[var(--espresso)]"),
	);
}
