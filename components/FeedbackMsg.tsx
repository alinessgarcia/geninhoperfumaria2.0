"use client";

import type { Feedback } from "./types";

export function FeedbackMsg({ fb }: { fb: Feedback }) {
  if (!fb) return null;
  return <div className={`feedback ${fb.kind}`}>{fb.kind === "ok" ? "✓" : "✕"} {fb.text}</div>;
}
