import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";

export default async function AboutPage() {
	const { locale, t } = await getServerI18n();

	const points =
		locale === "id"
			? [
					"Membantu brewer rumahan dan profesional mencatat resep kopi dengan struktur yang jelas.",
					"Membangun komunitas terbuka agar pembelajaran seduh bisa dibagikan lintas level pengalaman.",
					"Menyediakan alat untuk evaluasi rasa yang konsisten melalui review multi-dimensi.",
				]
			: [
					"Help home brewers and professionals document recipes with structured, repeatable data.",
					"Build an open community where brewing lessons are shared across all experience levels.",
					"Provide tools for consistent sensory evaluation through multi-dimensional reviews.",
				];

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<Badge>{t("about.title")}</Badge>
				<h1 className="font-heading text-4xl text-[var(--espresso)]">
					{locale === "id" ? "Platform Kopi untuk Pembelajar Serius" : "A Coffee Platform for Serious Learners"}
				</h1>
				<p className="text-[var(--muted)]">
					{locale === "id"
						? "Coffee Brew dibuat untuk menggabungkan pencatatan resep, komunitas, dan moderasi dalam satu alur kerja."
						: "Coffee Brew is built to combine recipe tracking, community collaboration, and moderation in one workflow."}
				</p>
			</header>

			<div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
				<Card className="space-y-3">
					{points.map((point) => (
						<p key={point} className="text-sm text-[var(--muted)]">
							{point}
						</p>
					))}
				</Card>
				<div className="relative h-72 overflow-hidden rounded-3xl border">
					<Image
						src="https://images.unsplash.com/photo-1459755486867-b55449bb39ff?auto=format&fit=crop&w=1200&q=80"
						alt={locale === "id" ? "Tim kopi berdiskusi" : "Coffee team discussing brew notes"}
						fill
						sizes="(max-width: 1024px) 100vw, 33vw"
						className="object-cover"
					/>
				</div>
			</div>
		</div>
	);
}
