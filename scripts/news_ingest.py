# Simple RSS ingestion for perfume market news.
# Usage:
#   pip install -r scripts/requirements-news.txt
#   copy scripts/.env.example to scripts/.env and fill values
#   python scripts/news_ingest.py

import os
import sys
from datetime import datetime, timezone

import feedparser
from supabase import create_client
from dotenv import load_dotenv


def parse_datetime(entry):
    for key in ("published_parsed", "updated_parsed"):
        value = entry.get(key)
        if value:
            return datetime(*value[:6], tzinfo=timezone.utc)
    return None


def main():
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    feeds = os.getenv("NEWS_FEEDS", "")

    if not supabase_url or not supabase_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return 1

    feed_urls = [f.strip() for f in feeds.split(",") if f.strip()]
    if not feed_urls:
        print("No feeds configured. Set NEWS_FEEDS with comma-separated RSS URLs")
        return 1

    client = create_client(supabase_url, supabase_key)

    inserted = 0
    for url in feed_urls:
        parsed = feedparser.parse(url)
        source = parsed.feed.get("title", url)
        for entry in parsed.entries[:50]:
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            if not title or not link:
                continue

            published_at = parse_datetime(entry)
            payload = {
                "source": source,
                "title": title,
                "url": link,
                "published_at": published_at.isoformat() if published_at else None,
            }

            result = (
                client.table("news_articles")
                .upsert(payload, on_conflict="url")
                .execute()
            )
            if result.data:
                inserted += 1

    print(f"Inserted {inserted} articles")
    return 0


if __name__ == "__main__":
    sys.exit(main())
