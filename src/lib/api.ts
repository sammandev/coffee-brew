import { NextResponse } from "next/server";

export function apiError(message: string, status = 400, details?: string) {
	return NextResponse.json(
		{
			error: message,
			details,
		},
		{ status },
	);
}

export function apiOk<T>(data: T, status = 200) {
	return NextResponse.json(data, { status });
}
