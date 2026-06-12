import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

type Region = "DOMESTIC" | "INTERNATIONAL";

type EventRow = {
	id: string;
	display_date: string;
	sort_date: string;
	is_period: number | boolean | null;
	end_date: string | null;
	title: string;
	content: string | null;
	region: Region;
	tags: string | null;
	related_event_ids: string | null;
	created_at: string | null;
	updated_at: string | null;
};

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

type EventInput = {
	id?: unknown;
	date?: unknown;
	displayDate?: unknown;
	display_date?: unknown;
	sortDate?: unknown;
	sort_date?: unknown;
	isPeriod?: unknown;
	is_period?: unknown;
	endDate?: unknown;
	end_date?: unknown;
	title?: unknown;
	content?: unknown;
	region?: unknown;
	tags?: unknown;
	relatedEventIds?: unknown;
	related_event_ids?: unknown;
	input?: unknown;
	text?: unknown;
	raw?: unknown;
};

type CloudflareD1Env = Record<string, unknown> &
	CloudflareEnv & {
		timeline_db: D1Database;
	};

const VALID_REGIONS = new Set<Region>(["DOMESTIC", "INTERNATIONAL"]);
const ISO_DATE_PATTERN = /\d{4}-\d{2}-\d{2}/;

function parseJsonList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((item) => String(item).trim()).filter(Boolean);
	}

	if (typeof value !== "string") {
		return [];
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return [];
	}

	try {
		const parsed = JSON.parse(trimmed);
		if (Array.isArray(parsed)) {
			return parsed.map((item) => String(item).trim()).filter(Boolean);
		}
	} catch {
		return trimmed
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}

	return [];
}

function toTimelineEvent(row: EventRow): TimelineEvent {
	return {
		id: row.id,
		displayDate: row.display_date,
		sortDate: row.sort_date,
		isPeriod: Boolean(row.is_period),
		endDate: row.end_date,
		title: row.title,
		content: row.content ?? "",
		region: row.region,
		tags: parseJsonList(row.tags),
		relatedEventIds: parseJsonList(row.related_event_ids),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function firstString(...values: unknown[]): string {
	for (const value of values) {
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}

	return "";
}

function normalizeRegion(value: unknown): Region {
	if (typeof value === "string") {
		const upper = value.trim().toUpperCase();
		if (VALID_REGIONS.has(upper as Region)) {
			return upper as Region;
		}
	}

	return "DOMESTIC";
}

function normalizeBoolean(value: unknown): boolean {
	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value === "number") {
		return value !== 0;
	}

	if (typeof value === "string") {
		return ["1", "true", "yes", "period"].includes(value.trim().toLowerCase());
	}

	return false;
}

function extractHashTags(text: string): { content: string; tags: string[] } {
	const tags = Array.from(text.matchAll(/#([^\s#]+)/g), (match) => match[1]?.trim()).filter(Boolean) as string[];
	const content = text.replace(/\s*#[^\s#]+/g, "").trim();

	return { content, tags };
}

function normalizeSortDate(displayDate: string): string {
	return displayDate.match(ISO_DATE_PATTERN)?.[0] ?? displayDate;
}

function normalizeEventInput(body: EventInput) {
	const rawInput = firstString(body.input, body.text, body.raw);

	if (rawInput) {
		const [datePart = "", titlePart = "", ...contentParts] = rawInput.split("/").map((part) => part.trim());
		const contentSource = contentParts.join(" / ");
		const { content, tags } = extractHashTags(contentSource);
		const dates = Array.from(rawInput.matchAll(ISO_DATE_PATTERN), (match) => match[0]);

		return {
			id: firstString(body.id) || crypto.randomUUID(),
			displayDate: datePart,
			sortDate: dates[0] ?? normalizeSortDate(datePart),
			isPeriod: dates.length > 1,
			endDate: dates[1] ?? null,
			title: titlePart,
			content,
			region: normalizeRegion(body.region),
			tags,
			relatedEventIds: parseJsonList(body.relatedEventIds ?? body.related_event_ids),
		};
	}

	const displayDate = firstString(body.displayDate, body.display_date, body.date);
	const sortDate = firstString(body.sortDate, body.sort_date) || normalizeSortDate(displayDate);
	const tags = parseJsonList(body.tags);
	const relatedEventIds = parseJsonList(body.relatedEventIds ?? body.related_event_ids);

	return {
		id: firstString(body.id) || crypto.randomUUID(),
		displayDate,
		sortDate,
		isPeriod: normalizeBoolean(body.isPeriod ?? body.is_period),
		endDate: firstString(body.endDate, body.end_date) || null,
		title: firstString(body.title),
		content: firstString(body.content),
		region: normalizeRegion(body.region),
		tags,
		relatedEventIds,
	};
}

function validateEventInput(input: ReturnType<typeof normalizeEventInput>): string | null {
	if (!input.displayDate) {
		return "displayDate or date is required.";
	}

	if (!input.sortDate) {
		return "sortDate could not be inferred.";
	}

	if (!input.title) {
		return "title is required.";
	}

	return null;
}

function getDatabase() {
	const { env } = getCloudflareContext<CloudflareD1Env>();
	return (env as CloudflareD1Env).timeline_db;
}

export async function GET() {
	try {
		const db = getDatabase();
		const { results } = await db.prepare("SELECT * FROM events ORDER BY sort_date ASC").all<EventRow>();

		return NextResponse.json({
			events: (results ?? []).map(toTimelineEvent),
		});
	} catch (error) {
		console.error("Failed to fetch events", error);

		return NextResponse.json({ error: "Failed to fetch events." }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as EventInput;
		const input = normalizeEventInput(body);
		const validationError = validateEventInput(input);

		if (validationError) {
			return NextResponse.json({ error: validationError }, { status: 400 });
		}

		const db = getDatabase();
		const now = new Date().toISOString();

		await db
			.prepare(
				`INSERT INTO events (
					id,
					display_date,
					sort_date,
					is_period,
					end_date,
					title,
					content,
					region,
					tags,
					related_event_ids,
					created_at,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				input.id,
				input.displayDate,
				input.sortDate,
				input.isPeriod ? 1 : 0,
				input.endDate,
				input.title,
				input.content,
				input.region,
				JSON.stringify(input.tags),
				JSON.stringify(input.relatedEventIds),
				now,
				now,
			)
			.run();

		return NextResponse.json(
			{
				event: {
					id: input.id,
					displayDate: input.displayDate,
					sortDate: input.sortDate,
					isPeriod: input.isPeriod,
					endDate: input.endDate,
					title: input.title,
					content: input.content,
					region: input.region,
					tags: input.tags,
					relatedEventIds: input.relatedEventIds,
					createdAt: now,
					updatedAt: now,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Failed to create event", error);

		return NextResponse.json({ error: "Failed to create event." }, { status: 500 });
	}
}
