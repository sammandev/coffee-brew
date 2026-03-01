"use client";

import { Pause, Play, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface BlogTtsControlsProps {
	locale: "en" | "id";
	text: string;
}

const RATE_OPTIONS = [0.85, 1, 1.15, 1.3] as const;

export function BlogTtsControls({ locale, text }: BlogTtsControlsProps) {
	const [supported, setSupported] = useState(false);
	const [speaking, setSpeaking] = useState(false);
	const [paused, setPaused] = useState(false);
	const [rate, setRate] = useState<number>(1);
	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

	useEffect(() => {
		setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
	}, []);

	useEffect(
		() => () => {
			if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
			window.speechSynthesis.cancel();
		},
		[],
	);

	const normalizedText = useMemo(() => text.trim(), [text]);
	const languageCode = locale === "id" ? "id-ID" : "en-US";

	function stopPlayback() {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
		window.speechSynthesis.cancel();
		utteranceRef.current = null;
		setSpeaking(false);
		setPaused(false);
	}

	function findBestVoice() {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
		const voices = window.speechSynthesis.getVoices();
		if (voices.length === 0) return null;
		return (
			voices.find((voice) => voice.lang === languageCode) ?? voices.find((voice) => voice.lang.startsWith(locale)) ?? null
		);
	}

	function playOrResume() {
		if (!supported || normalizedText.length === 0) return;
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

		if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
			window.speechSynthesis.resume();
			setPaused(false);
			setSpeaking(true);
			return;
		}

		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(normalizedText);
		utterance.lang = languageCode;
		utterance.rate = rate;
		const voice = findBestVoice();
		if (voice) {
			utterance.voice = voice;
		}
		utterance.onend = () => {
			setSpeaking(false);
			setPaused(false);
			utteranceRef.current = null;
		};
		utterance.onerror = () => {
			setSpeaking(false);
			setPaused(false);
			utteranceRef.current = null;
		};
		utterance.onpause = () => {
			setPaused(true);
		};
		utterance.onresume = () => {
			setPaused(false);
		};
		utteranceRef.current = utterance;
		window.speechSynthesis.speak(utterance);
		setSpeaking(true);
		setPaused(false);
	}

	function pausePlayback() {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
		if (!window.speechSynthesis.speaking) return;
		window.speechSynthesis.pause();
		setPaused(true);
	}

	return (
		<section className="space-y-3 rounded-2xl border border-(--border) bg-(--surface) p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="font-heading text-lg text-(--espresso)">
					{locale === "id" ? "Dengarkan Artikel" : "Listen to this article"}
				</h2>
				{supported ? (
					<label className="inline-flex items-center gap-2 text-xs text-(--muted)">
						<span>{locale === "id" ? "Kecepatan" : "Speed"}</span>
						<select
							value={rate}
							onChange={(event) => setRate(Number(event.currentTarget.value))}
							className="rounded-md border border-(--border) bg-(--surface-elevated) px-2 py-1 text-xs"
						>
							{RATE_OPTIONS.map((option) => (
								<option key={option} value={option}>
									{option.toFixed(2)}x
								</option>
							))}
						</select>
					</label>
				) : null}
			</div>

			{supported ? (
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={playOrResume}
						disabled={normalizedText.length === 0}
						className="inline-flex items-center gap-1 rounded-full border border-(--border) bg-(--surface-elevated) px-3 py-1.5 text-sm font-semibold hover:bg-(--sand)/15 disabled:opacity-60"
					>
						<Play size={14} />
						{paused ? (locale === "id" ? "Lanjut" : "Resume") : locale === "id" ? "Putar" : "Play"}
					</button>
					<button
						type="button"
						onClick={pausePlayback}
						disabled={!speaking || paused}
						className="inline-flex items-center gap-1 rounded-full border border-(--border) bg-(--surface-elevated) px-3 py-1.5 text-sm font-semibold hover:bg-(--sand)/15 disabled:opacity-60"
					>
						<Pause size={14} />
						{locale === "id" ? "Jeda" : "Pause"}
					</button>
					<button
						type="button"
						onClick={stopPlayback}
						disabled={!speaking && !paused}
						className="inline-flex items-center gap-1 rounded-full border border-(--border) bg-(--surface-elevated) px-3 py-1.5 text-sm font-semibold hover:bg-(--sand)/15 disabled:opacity-60"
					>
						<Square size={14} />
						{locale === "id" ? "Hentikan" : "Stop"}
					</button>
				</div>
			) : (
				<p className="text-sm text-(--muted)">
					{locale === "id"
						? "Peramban ini belum mendukung Text-to-Speech."
						: "This browser does not support Speech Synthesis."}
				</p>
			)}
		</section>
	);
}
