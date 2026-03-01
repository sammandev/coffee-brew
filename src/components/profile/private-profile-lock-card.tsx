import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PrivateProfileLockCardProps {
	locale: "en" | "id";
}

export function PrivateProfileLockCard({ locale }: PrivateProfileLockCardProps) {
	return (
		<Card className="space-y-3 rounded-2xl border border-(--border) bg-(--surface-elevated) p-5">
			<div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-(--sand)/30 text-(--espresso)">
				<Lock size={16} />
			</div>
			<h2 className="font-heading text-xl text-(--espresso)">{locale === "id" ? "Profil Dikunci" : "Profile Locked"}</h2>
			<p className="text-sm text-(--muted)">
				{locale === "id"
					? "Pengguna ini mengaktifkan profil privat. Informasi publik, aktivitas, dan detail profil disembunyikan."
					: "This user has enabled a private profile. Public information, activity, and profile details are hidden."}
			</p>
		</Card>
	);
}
