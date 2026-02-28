export interface SubscribePayload {
	email: string;
	source: string;
}

export interface NewsletterResult {
	ok: boolean;
	providerId?: string;
	message?: string;
}

export interface NewsletterProvider {
	subscribe(payload: SubscribePayload): Promise<NewsletterResult>;
	unsubscribe(email: string): Promise<NewsletterResult>;
}
