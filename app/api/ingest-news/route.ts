import Parser from "rss-parser";
import { NextResponse } from "next/server";

import {
  hasSupabaseServerConfig,
  supabaseServer,
} from "../../../lib/supabaseServer";

const parser = new Parser();

const pickImageUrl = (item: Record<string, unknown>) => {
  const enclosure = item.enclosure as { url?: string } | undefined;
  const mediaContent = item["media:content"] as { url?: string } | undefined;
  const mediaThumb = item["media:thumbnail"] as { url?: string } | undefined;
  const itunes = item.itunes as { image?: string } | undefined;
  const image = item.image as { url?: string } | undefined;

  return (
    enclosure?.url ||
    mediaContent?.url ||
    mediaThumb?.url ||
    itunes?.image ||
    image?.url ||
    ""
  );
};

const splitFeeds = (raw: string | undefined) =>
  (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const chunk = <T,>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

export async function GET() {
  if (!hasSupabaseServerConfig) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase server credentials." },
      { status: 500 }
    );
  }

  const feeds = splitFeeds(process.env.NEWS_FEEDS);
  if (feeds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "NEWS_FEEDS not configured." },
      { status: 400 }
    );
  }

  let inserted = 0;
  const errors: string[] = [];

  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const source = feed.title || new URL(feedUrl).hostname;

      const payload = (feed.items ?? [])
        .slice(0, 50)
        .map((item) => {
          const url = item.link || item.guid || "";
          if (!url) return null;

          const publishedAt = item.isoDate
            ? new Date(item.isoDate).toISOString()
            : item.pubDate
            ? new Date(item.pubDate).toISOString()
            : null;

          return {
            source,
            title: item.title || "Sem titulo",
            url,
            image_url: pickImageUrl(item as Record<string, unknown>) || null,
            published_at: publishedAt,
          };
        })
        .filter(Boolean) as Array<{
        source: string;
        title: string;
        url: string;
        image_url: string | null;
        published_at: string | null;
      }>;

      for (const batch of chunk(payload, 50)) {
        const { data, error } = await supabaseServer
          .from("news_articles")
          .upsert(batch, { onConflict: "url" })
          .select("id");

        if (error) {
          errors.push(`${feedUrl}: ${error.message}`);
        } else if (data) {
          inserted += data.length;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${feedUrl}: ${message}`);
    }
  }

  return NextResponse.json({ ok: errors.length === 0, inserted, errors });
}
