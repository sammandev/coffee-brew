import type { Locale } from "@/lib/i18n/types";

export interface BlogPost {
	slug: string;
	imageUrl: string;
	imageAltEn: string;
	imageAltId: string;
	publishedAt: string;
	titleEn: string;
	titleId: string;
	excerptEn: string;
	excerptId: string;
	bodyEn: string[];
	bodyId: string[];
}

export const BLOG_POSTS: BlogPost[] = [
	{
		slug: "dialing-in-pour-over-at-home",
		imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1400&q=80",
		imageAltEn: "Pour over coffee setup",
		imageAltId: "Peralatan pour over kopi",
		publishedAt: "2026-02-20T09:00:00.000Z",
		titleEn: "Dialing In Pour Over at Home",
		titleId: "Menyetel Pour Over di Rumah",
		excerptEn: "A practical workflow to tune grind size, water ratio, and extraction time for cleaner cups.",
		excerptId: "Alur praktis untuk menyetel ukuran giling, rasio air, dan waktu ekstraksi agar cangkir lebih bersih.",
		bodyEn: [
			"Start by fixing one variable at a time. Keep your brew ratio stable for several attempts before touching temperature or grind settings.",
			"If your cup is sour and thin, grind slightly finer or extend brew time. If it is bitter and dry, coarsen the grind or lower extraction time.",
			"Log every brew in Coffee Brew so you can compare outcomes week by week instead of relying on memory.",
		],
		bodyId: [
			"Mulailah dengan mengunci satu variabel setiap kali. Pertahankan rasio seduh untuk beberapa percobaan sebelum mengubah suhu atau gilingan.",
			"Jika cangkir terasa asam dan tipis, giling sedikit lebih halus atau perpanjang waktu seduh. Jika pahit dan kering, buat gilingan lebih kasar atau kurangi waktu ekstraksi.",
			"Catat setiap seduhan di Coffee Brew agar kamu bisa membandingkan hasil dari minggu ke minggu tanpa bergantung pada ingatan.",
		],
	},
	{
		slug: "water-chemistry-for-daily-brewing",
		imageUrl: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1400&q=80",
		imageAltEn: "Fresh coffee beans and cup",
		imageAltId: "Biji kopi segar dan cangkir",
		publishedAt: "2026-02-25T08:30:00.000Z",
		titleEn: "Water Chemistry for Daily Brewing",
		titleId: "Kimia Air untuk Seduhan Harian",
		excerptEn: "Why water ppm and mineral balance can change sweetness, body, and clarity in your brew.",
		excerptId: "Mengapa ppm air dan keseimbangan mineral bisa mengubah sweetness, body, dan clarity pada seduhan.",
		bodyEn: [
			"Coffee is mostly water, so small differences in mineral content can dramatically affect extraction and flavor perception.",
			"Try testing two water profiles with the same beans and recipe. Record acidity, sweetness, and body scores for direct comparison.",
			"A stable water source is one of the fastest ways to make your brew quality more consistent every day.",
		],
		bodyId: [
			"Kopi sebagian besar terdiri dari air, jadi perbedaan kecil kandungan mineral bisa sangat memengaruhi ekstraksi dan persepsi rasa.",
			"Coba uji dua profil air dengan biji dan resep yang sama. Catat skor acidity, sweetness, dan body untuk perbandingan langsung.",
			"Sumber air yang stabil adalah salah satu cara tercepat untuk membuat kualitas seduhan lebih konsisten setiap hari.",
		],
	},
];

export function getBlogPostBySlug(slug: string) {
	return BLOG_POSTS.find((post) => post.slug === slug) ?? null;
}

export function localizeBlogText(post: BlogPost, locale: Locale) {
	return {
		title: locale === "id" ? post.titleId : post.titleEn,
		excerpt: locale === "id" ? post.excerptId : post.excerptEn,
		body: locale === "id" ? post.bodyId : post.bodyEn,
		imageAlt: locale === "id" ? post.imageAltId : post.imageAltEn,
	};
}
