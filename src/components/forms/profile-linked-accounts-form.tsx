"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPreparedAuthCallbackUrl } from "@/lib/auth-callback-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface ProfileLinkedAccountsFormProps {
	enableGoogleLogin: boolean;
}

interface IdentityRecord {
	id: string;
	provider?: string | null;
}

export function ProfileLinkedAccountsForm({ enableGoogleLogin }: ProfileLinkedAccountsFormProps) {
	const { t } = useAppPreferences();
	const [isLoading, setIsLoading] = useState(true);
	const [isLinking, setIsLinking] = useState(false);
	const [isGoogleLinked, setIsGoogleLinked] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const googleStateText = useMemo(() => {
		if (!enableGoogleLogin) return t("auth.googleLoginDisabled");
		return isGoogleLinked ? t("auth.googleConnected") : t("auth.googleNotConnected");
	}, [enableGoogleLogin, isGoogleLinked, t]);

	useEffect(() => {
		let active = true;

		async function loadIdentities() {
			setIsLoading(true);
			setError(null);

			const supabase = createSupabaseBrowserClient();
			const { data, error: identitiesError } = await supabase.auth.getUserIdentities();
			if (!active) return;

			if (identitiesError) {
				setError(identitiesError.message);
				setIsLoading(false);
				return;
			}

			const identities = (data?.identities ?? []) as IdentityRecord[];
			const linked = identities.some((identity) => identity.provider?.toLowerCase() === "google");
			setIsGoogleLinked(linked);
			setIsLoading(false);
		}

		void loadIdentities();

		return () => {
			active = false;
		};
	}, []);

	async function connectGoogle() {
		if (!enableGoogleLogin || isGoogleLinked || isLinking) return;
		setIsLinking(true);
		setError(null);
		setSuccess(null);

		try {
			const supabase = createSupabaseBrowserClient();
			const returnPath = `${window.location.pathname}${window.location.search}`;
			const redirectTo = await getPreparedAuthCallbackUrl(returnPath);
			const { data, error: linkError } = await supabase.auth.linkIdentity({
				provider: "google",
				options: {
					redirectTo,
				},
			});

			if (linkError) {
				setError(linkError.message);
				setIsLinking(false);
				return;
			}

			if (typeof data?.url === "string" && data.url.length > 0) {
				window.location.assign(data.url);
				return;
			}

			setSuccess(t("auth.googleLinkRedirecting"));
			setIsLinking(false);
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "Could not prepare secure authentication callback.");
			setIsLinking(false);
		}
	}

	return (
		<Card className="grid gap-3">
			<h3 className="font-heading text-xl text-(--espresso)">{t("auth.linkedAccountsTitle")}</h3>
			<p className="text-sm text-(--muted)">{t("auth.linkedAccountsDescription")}</p>

			<div className="rounded-2xl border bg-(--surface) p-3">
				<p className="text-sm font-semibold text-(--espresso)">Google</p>
				<p className="mt-1 text-sm text-(--muted)">{isLoading ? t("common.loading") : googleStateText}</p>
			</div>

			<div className="flex justify-end">
				<Button
					type="button"
					onClick={() => void connectGoogle()}
					disabled={!enableGoogleLogin || isGoogleLinked || isLoading || isLinking}
				>
					{isLinking ? (
						<span className="inline-flex items-center gap-2">
							<Loader2 size={14} className="animate-spin" />
							{t("auth.connectingGoogle")}
						</span>
					) : (
						t("auth.connectGoogle")
					)}
				</Button>
			</div>

			{error ? <p className="text-sm text-(--danger)">{error}</p> : null}
			{success ? <p className="text-sm text-(--accent)">{success}</p> : null}
		</Card>
	);
}
