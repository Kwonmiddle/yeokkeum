"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Globe2, Loader2, Plus, Sparkles } from "lucide-react";
import { clsx } from "clsx";

type Region = "DOMESTIC" | "INTERNATIONAL";

type TimelineEvent = {
	id: string;
	displayDate: string;
	sortDate: string;
	isPeriod: boolean;
	endDate: string | null;
	title: string;
	content: string;
	region: Region;
	tags: string[];
	relatedEventIds: string[];
	createdAt: string | null;
	updatedAt: string | null;
};

const REGION_LABEL: Record<Region, string> = {
	DOMESTIC: "국내",
	INTERNATIONAL: "국외",
};

const REGION_TONE: Record<Region, string> = {
	DOMESTIC: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
	INTERNATIONAL: "border-violet-300/30 bg-violet-400/10 text-violet-100",
};

function EventCard({
	event,
	highlightedIds,
	hasHover,
	onHover,
}: {
	event: TimelineEvent;
	highlightedIds: Set<string>;
	hasHover: boolean;
	onHover: (id: string | null) => void;
}) {
	const highlighted = highlightedIds.has(event.id);
	const dimmed = hasHover && !highlighted;

	return (
		<article
			onMouseEnter={() => onHover(event.id)}
			onMouseLeave={() => onHover(null)}
			className={clsx(
				"group rounded-3xl border bg-slate-950/75 p-5 shadow-2xl shadow-black/20 backdrop-blur transition duration-300",
				highlighted
					? "border-amber-300/70 shadow-amber-500/10 ring-2 ring-amber-300/20"
					: "border-white/10 hover:border-white/25 hover:bg-slate-900/90",
				dimmed && "scale-[0.98] opacity-35",
			)}
		>
			<div className="mb-4 flex items-center justify-between gap-3">
				<span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
					{event.isPeriod && event.endDate ? `${event.displayDate} - ${event.endDate}` : event.displayDate}
				</span>
				<span className={clsx("rounded-full border px-2.5 py-1 text-xs font-semibold", REGION_TONE[event.region])}>
					{REGION_LABEL[event.region]}
				</span>
			</div>

			<h3 className="text-xl font-semibold tracking-tight text-white">{event.title}</h3>
			<p className="mt-3 text-sm leading-6 text-slate-300">{event.content}</p>

			{event.tags.length > 0 && (
				<div className="mt-5 flex flex-wrap gap-2">
					{event.tags.map((tag) => (
						<span key={tag} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-slate-300">
							#{tag}
						</span>
					))}
				</div>
			)}
		</article>
	);
}

export default function Home() {
	const [events, setEvents] = useState<TimelineEvent[]>([]);
	const [input, setInput] = useState("");
	const [region, setRegion] = useState<Region>("DOMESTIC");
	const [activeTag, setActiveTag] = useState<string | null>(null);
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function loadEvents() {
		setError(null);
		const response = await fetch("/api/events", { cache: "no-store" });

		if (!response.ok) {
			throw new Error("사건 목록을 불러오지 못했습니다.");
		}

		const data = (await response.json()) as { events: TimelineEvent[] };
		setEvents(data.events);
	}

	useEffect(() => {
		loadEvents()
			.catch((loadError) => setError(loadError instanceof Error ? loadError.message : "알 수 없는 오류가 발생했습니다."))
			.finally(() => setIsLoading(false));
	}, []);

	const tags = useMemo(() => {
		const counts = new Map<string, number>();

		for (const event of events) {
			for (const tag of event.tags) {
				counts.set(tag, (counts.get(tag) ?? 0) + 1);
			}
		}

		return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	}, [events]);

	const filteredEvents = useMemo(() => {
		if (!activeTag) {
			return events;
		}

		return events.filter((event) => event.tags.includes(activeTag));
	}, [events, activeTag]);

	const highlightedIds = useMemo(() => {
		if (!hoveredId) {
			return new Set<string>();
		}

		const hoveredEvent = events.find((event) => event.id === hoveredId);
		const ids = new Set<string>([hoveredId, ...(hoveredEvent?.relatedEventIds ?? [])]);

		for (const event of events) {
			if (event.relatedEventIds.includes(hoveredId)) {
				ids.add(event.id);
			}
		}

		return ids;
	}, [events, hoveredId]);

	async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
		event?.preventDefault();

		if (!input.trim()) {
			return;
		}

		setIsSaving(true);
		setError(null);

		try {
			const response = await fetch("/api/events", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ input, region }),
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => null)) as { error?: string } | null;
				throw new Error(data?.error ?? "사건을 저장하지 못했습니다.");
			}

			setInput("");
			await loadEvents();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setIsSaving(false);
		}
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter" && !event.nativeEvent.isComposing) {
			event.preventDefault();
			void handleSubmit();
		}

		if (event.key === "Tab") {
			event.preventDefault();
			setRegion((current) => (current === "DOMESTIC" ? "INTERNATIONAL" : "DOMESTIC"));
		}
	}

	return (
		<main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_28%),#020617] px-5 py-8 text-slate-100 sm:px-8 lg:px-12">
			<section className="mx-auto flex max-w-6xl flex-col gap-8">
				<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
					<div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div>
							<p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-300">
								<Sparkles className="size-3.5 text-cyan-200" />
								Yeokkeum Timeline
							</p>
							<h1 className="text-4xl font-bold tracking-[-0.04em] text-white md:text-6xl">
								역사를 세로로 엮는
								<span className="block bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">
									인터랙티브 타임라인
								</span>
							</h1>
						</div>
						<p className="max-w-sm text-sm leading-6 text-slate-400">
							국내와 국외 사건을 한 축 위에 배치하고, 관련 사건은 카드 호버만으로 은은하게 연결됩니다.
						</p>
					</div>

					<form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
						<div className="flex flex-col gap-3 md:flex-row md:items-center">
							<div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-slate-400 md:flex-1">
								<Plus className="size-4 shrink-0" />
								<input
									value={input}
									onChange={(event) => setInput(event.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="YYYY-MM-DD / 사건 제목 / 설명 #태그  (Enter 저장, Tab 지역 전환)"
									className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
								/>
							</div>
							<button
								type="button"
								onClick={() => setRegion((current) => (current === "DOMESTIC" ? "INTERNATIONAL" : "DOMESTIC"))}
								className={clsx(
									"rounded-xl border px-4 py-3 text-sm font-semibold transition hover:scale-[1.01]",
									REGION_TONE[region],
								)}
							>
								{REGION_LABEL[region]}
							</button>
							<button
								type="submit"
								disabled={isSaving || !input.trim()}
								className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
							>
								{isSaving ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
								추가
							</button>
						</div>
					</form>

					{error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}
				</div>

				<div className="flex flex-wrap items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur">
					<button
						onClick={() => setActiveTag(null)}
						className={clsx(
							"rounded-full px-4 py-2 text-sm font-medium transition",
							activeTag === null ? "bg-white text-slate-950" : "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]",
						)}
					>
						전체 {events.length}
					</button>
					{tags.map(([tag, count]) => (
						<button
							key={tag}
							onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
							className={clsx(
								"rounded-full px-4 py-2 text-sm transition",
								activeTag === tag
									? "bg-cyan-200 text-slate-950"
									: "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white",
							)}
						>
							#{tag} <span className="text-xs opacity-70">{count}</span>
						</button>
					))}
				</div>

				<section className="relative pb-16">
					<div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/25 to-transparent md:block" />

					{isLoading ? (
						<div className="flex min-h-80 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.035]">
							<Loader2 className="size-8 animate-spin text-cyan-200" />
						</div>
					) : filteredEvents.length === 0 ? (
						<div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-12 text-center text-slate-400">
							표시할 사건이 없습니다.
						</div>
					) : (
						<div className="space-y-5 md:space-y-0">
							{filteredEvents.map((event) => {
								const isDomestic = event.region === "DOMESTIC";

								return (
									<div key={event.id} className="relative grid gap-4 md:grid-cols-[1fr_96px_1fr] md:items-center md:py-6">
										<div className={clsx("hidden md:block", !isDomestic && "md:col-start-3")}>
											<EventCard event={event} highlightedIds={highlightedIds} hasHover={Boolean(hoveredId)} onHover={setHoveredId} />
										</div>

										<div className="hidden items-center justify-center md:col-start-2 md:flex">
											<div
												className={clsx(
													"z-10 flex size-12 items-center justify-center rounded-full border bg-slate-950 shadow-xl",
													isDomestic ? "border-cyan-300/40 text-cyan-200" : "border-violet-300/40 text-violet-200",
												)}
											>
												<Globe2 className="size-5" />
											</div>
										</div>

										<div className="md:hidden">
											<EventCard event={event} highlightedIds={highlightedIds} hasHover={Boolean(hoveredId)} onHover={setHoveredId} />
										</div>
									</div>
								);
							})}
						</div>
					)}
				</section>
			</section>
		</main>
	);
}
