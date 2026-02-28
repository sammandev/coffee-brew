interface SupabaseErrorLike {
	details?: string | null;
	hint?: string | null;
	message?: string | null;
}

export function isMissingColumnError(error: SupabaseErrorLike | null | undefined, columns: string[]) {
	if (!error) return false;
	const haystack = [error.message, error.details, error.hint]
		.filter((value): value is string => typeof value === "string" && value.length > 0)
		.join(" ")
		.toLowerCase();

	if (!haystack) return false;
	return columns.some((column) => haystack.includes(column.toLowerCase()));
}
