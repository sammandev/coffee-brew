export class UnauthorizedError extends Error {
	constructor(message = "Unauthorized") {
		super(message);
		this.name = "UnauthorizedError";
	}
}

export class AccountDisabledError extends Error {
	constructor(message = "Account blocked or disabled") {
		super(message);
		this.name = "AccountDisabledError";
	}
}

export class ForbiddenError extends Error {
	constructor(message = "Forbidden") {
		super(message);
		this.name = "ForbiddenError";
	}
}
