import { FaqManager } from "@/components/forms/faq-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardFaqPage() {
	const supabase = await createSupabaseServerClient();
	const { data: items } = await supabase
		.from("faq_items")
		.select("id, question_en, answer_en, question_id, answer_id, order_index, status, is_visible")
		.order("order_index", { ascending: true });

	return (
		<div className="space-y-6">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">FAQ Manager</h1>
			<FaqManager items={items ?? []} />
		</div>
	);
}
