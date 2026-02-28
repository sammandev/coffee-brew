import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/lib/i18n/types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDate(value: string | number | Date, locale: Locale = "en") {
	const dateLocale = locale === "id" ? "id-ID" : "en-US";

	return new Intl.DateTimeFormat(dateLocale, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

export function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

export function celsiusToFahrenheit(celsius: number) {
	return (celsius * 9) / 5 + 32;
}

export function average(values: number[]) {
	if (values.length === 0) return 0;
	return values.reduce((acc, value) => acc + value, 0) / values.length;
}
