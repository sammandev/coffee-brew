export default function GlobalLoading() {
	return (
		<div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="animate-pulse space-y-4">
				<div className="h-10 w-64 rounded-2xl bg-(--surface-elevated)" />
				<div className="h-6 w-full rounded-xl bg-(--surface-elevated)" />
				<div className="h-6 w-11/12 rounded-xl bg-(--surface-elevated)" />
				<div className="grid gap-4 md:grid-cols-3">
					<div className="h-36 rounded-3xl bg-(--surface-elevated)" />
					<div className="h-36 rounded-3xl bg-(--surface-elevated)" />
					<div className="h-36 rounded-3xl bg-(--surface-elevated)" />
				</div>
			</div>
		</div>
	);
}
