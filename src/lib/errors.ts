export class UnauthorizedError extends Error {
	readonly statusCode = 401;

	constructor(message = "Unauthorized") {
		super(message);
		this.name = "UnauthorizedError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class AccountDisabledError extends Error {
	readonly statusCode = 403;

	constructor(message = "Account blocked or disabled") {
		super(message);
		this.name = "AccountDisabledError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class ForbiddenError extends Error {
	readonly statusCode = 403;

	constructor(message = "Forbidden") {
		super(message);
		this.name = "ForbiddenError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
