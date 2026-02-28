import { brewSchema, faqItemSchema, landingSectionSchema, reviewSchema } from "@/lib/validators";

describe("brewSchema", () => {
	it("accepts valid brew payload", () => {
		const result = brewSchema.safeParse({
			name: "Morning V60",
			brewMethod: "V60",
			coffeeBeans: "Ethiopia Heirloom",
			brandRoastery: "Sunrise Roastery",
			waterType: "Filtered",
			waterPpm: 120,
			temperature: 93,
			temperatureUnit: "C",
			grindSize: "Medium Fine",
			grindClicks: 18,
			brewTimeSeconds: 190,
			brewerName: "Sam",
			notes: "Juicy and floral",
			status: "published",
		});

		expect(result.success).toBe(true);
	});

	it("rejects out-of-range ppm", () => {
		const result = brewSchema.safeParse({
			name: "Bad Brew",
			brewMethod: "V60",
			coffeeBeans: "Beans",
			brandRoastery: "Roastery",
			waterType: "Tap",
			waterPpm: 3000,
			temperature: 93,
			temperatureUnit: "C",
			grindSize: "Medium",
			brewTimeSeconds: 100,
			brewerName: "Sam",
			status: "draft",
		});

		expect(result.success).toBe(false);
	});
});

describe("reviewSchema", () => {
	it("rejects score higher than 5", () => {
		const result = reviewSchema.safeParse({
			acidity: 6,
			sweetness: 4,
			body: 4,
			aroma: 4,
			balance: 4,
		});

		expect(result.success).toBe(false);
	});
});

describe("landingSectionSchema", () => {
	it("accepts bilingual localized fields", () => {
		const result = landingSectionSchema.safeParse({
			section_type: "feature_grid",
			title: "English Title",
			title_id: "Judul Indonesia",
			subtitle: "English subtitle",
			subtitle_id: "Subjudul Indonesia",
			body: "English body",
			body_id: "Konten Indonesia",
			config: { ctaText: "Explore" },
			config_id: { ctaText: "Lihat" },
			order_index: 0,
			is_visible: true,
		});

		expect(result.success).toBe(true);
	});
});

describe("faqItemSchema", () => {
	it("requires bilingual question and answer fields", () => {
		const pass = faqItemSchema.safeParse({
			question_en: "What is Coffee Brew?",
			answer_en: "A coffee platform.",
			question_id: "Apa itu Coffee Brew?",
			answer_id: "Platform kopi.",
			order_index: 0,
			is_visible: true,
		});

		const fail = faqItemSchema.safeParse({
			question_en: "Only English",
			answer_en: "Only English",
			order_index: 0,
			is_visible: true,
		});

		expect(pass.success).toBe(true);
		expect(fail.success).toBe(false);
	});
});
