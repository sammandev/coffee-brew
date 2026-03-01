import { cn } from "@/lib/utils";

export interface FlavorRadarVector {
	acidity: number;
	sweetness: number;
	body: number;
	aroma: number;
	balance: number;
}

interface FlavorRadarChartProps {
	className?: string;
	community: FlavorRadarVector;
	communityLabel?: string;
	labels?: [string, string, string, string, string];
	maxValue?: number;
	myReviewLabel?: string;
	myReview?: FlavorRadarVector | null;
	size?: number;
}

function clampValue(value: number, maxValue: number) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(maxValue, value));
}

function polygonPoints(values: number[], radius: number, center: number, maxValue: number) {
	return values
		.map((value, index) => {
			const angle = (-Math.PI / 2 + (index * 2 * Math.PI) / values.length) % (2 * Math.PI);
			const distance = (clampValue(value, maxValue) / maxValue) * radius;
			const x = center + Math.cos(angle) * distance;
			const y = center + Math.sin(angle) * distance;
			return `${x.toFixed(2)},${y.toFixed(2)}`;
		})
		.join(" ");
}

export function FlavorRadarChart({
	className,
	community,
	communityLabel = "Community",
	labels = ["Acidity", "Sweetness", "Body", "Aroma", "Balance"],
	maxValue = 5,
	myReviewLabel = "My Review",
	myReview = null,
	size = 260,
}: FlavorRadarChartProps) {
	const center = size / 2;
	const radius = size * 0.34;
	const communityValues = [community.acidity, community.sweetness, community.body, community.aroma, community.balance];
	const myReviewValues = myReview
		? [myReview.acidity, myReview.sweetness, myReview.body, myReview.aroma, myReview.balance]
		: null;

	return (
		<figure className={cn("relative", className)}>
			<svg
				viewBox={`0 0 ${size} ${size}`}
				role="img"
				aria-label="Flavor balance radar chart"
				className="h-auto w-full overflow-visible"
			>
				<title>Flavor balance radar chart</title>

				{[1, 2, 3, 4, 5].map((step) => {
					const ringRadius = (radius * step) / 5;
					const points = polygonPoints([maxValue, maxValue, maxValue, maxValue, maxValue], ringRadius, center, maxValue);
					return (
						<polygon
							key={`ring-${step}`}
							points={points}
							fill="none"
							stroke="var(--border)"
							strokeWidth={step === 5 ? 1.2 : 1}
							opacity={step === 5 ? 0.8 : 0.45}
						/>
					);
				})}

				{labels.map((label, index) => {
					const angle = (-Math.PI / 2 + (index * 2 * Math.PI) / labels.length) % (2 * Math.PI);
					const axisX = center + Math.cos(angle) * radius;
					const axisY = center + Math.sin(angle) * radius;
					const labelX = center + Math.cos(angle) * (radius + 18);
					const labelY = center + Math.sin(angle) * (radius + 18);
					return (
						<g key={`axis-${label}`}>
							<line x1={center} y1={center} x2={axisX} y2={axisY} stroke="var(--border)" strokeWidth={1} opacity={0.7} />
							<text
								x={labelX}
								y={labelY}
								fill="var(--muted)"
								fontSize="10"
								fontWeight="600"
								textAnchor="middle"
								dominantBaseline="middle"
							>
								{label}
							</text>
						</g>
					);
				})}

				<polygon
					points={polygonPoints(communityValues, radius, center, maxValue)}
					fill="var(--crema)"
					fillOpacity={0.18}
					stroke="var(--crema)"
					strokeWidth={2}
				/>

				{myReviewValues ? (
					<polygon
						points={polygonPoints(myReviewValues, radius, center, maxValue)}
						fill="var(--espresso)"
						fillOpacity={0.18}
						stroke="var(--espresso)"
						strokeDasharray="4 2"
						strokeWidth={2}
					/>
				) : null}
			</svg>

			<figcaption className="mt-2 flex flex-wrap gap-2 text-xs text-(--muted)">
				<span className="inline-flex items-center gap-1">
					<span className="h-2.5 w-2.5 rounded-full bg-(--crema)" />
					{communityLabel}
				</span>
				{myReview ? (
					<span className="inline-flex items-center gap-1">
						<span className="h-2.5 w-2.5 rounded-full bg-(--espresso)" />
						{myReviewLabel}
					</span>
				) : null}
			</figcaption>
		</figure>
	);
}
