import { ProfileAvatarForm } from "@/components/forms/profile-avatar-form";
import { ProfileDisplayNameForm } from "@/components/forms/profile-display-name-form";
import { ProfileNewsletterForm } from "@/components/forms/profile-newsletter-form";
import { ProfilePasswordForm } from "@/components/forms/profile-password-form";
import { ProfileVisibilityForm } from "@/components/forms/profile-visibility-form";
import { Card } from "@/components/ui/card";

interface ProfileSettingsPanelProps {
	avatarUrl: string | null;
	displayName: string;
	email: string;
	labels: {
		displayName: string;
		email: string;
		status: string;
	};
	newsletterSubscribed: boolean;
	publicProfileHref: string;
	showOnlineStatus: boolean;
	isProfilePrivate: boolean;
	status: string;
}

export function ProfileSettingsPanel({
	avatarUrl,
	displayName,
	email,
	labels,
	newsletterSubscribed,
	publicProfileHref,
	showOnlineStatus,
	isProfilePrivate,
	status,
}: ProfileSettingsPanelProps) {
	return (
		<div className="space-y-5">
			<Card>
				<p className="text-sm text-(--muted)">
					{labels.displayName}: {displayName}
				</p>
				<p className="text-sm text-(--muted)">
					{labels.email}: {email}
				</p>
				<p className="text-sm text-(--muted)">
					{labels.status}: {status}
				</p>
			</Card>

			<div className="grid gap-5 lg:grid-cols-2">
				<ProfileAvatarForm displayName={displayName} initialAvatarUrl={avatarUrl} />
				<ProfileDisplayNameForm initialDisplayName={displayName} />
			</div>

			<ProfileVisibilityForm
				initialIsProfilePrivate={isProfilePrivate}
				initialShowOnlineStatus={showOnlineStatus}
				publicProfileHref={publicProfileHref}
			/>

			<ProfilePasswordForm />
			<ProfileNewsletterForm email={email} subscribed={newsletterSubscribed} />
		</div>
	);
}
