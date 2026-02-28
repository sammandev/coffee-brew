import { FaqForm } from "@/components/forms/faq-form";
import { FaqTable } from "@/components/forms/faq-table";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminFaqPage() {
	const supabase = await createSupabaseServerClient();
	const { data: items } = await supabase
		.from("faq_items")
		.select("id, question_en, question_id, order_index, is_visible")
		.order("order_index", { ascending: true });

	return (
		<div className="space-y-6">
			<h1 className="font-heading text-4xl text-[var(--espresso)]">FAQ Manager</h1>
			<div className="grid gap-6 lg:grid-cols-[1fr_360px]">
				<FaqTable items={items ?? []} />
				<FaqForm />
			</div>
		</div>
	);
}
