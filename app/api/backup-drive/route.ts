import { google } from "googleapis";
import { NextResponse } from "next/server";

import {
  hasSupabaseServerConfig,
  supabaseServer,
} from "../../../lib/supabaseServer";

const requiredEnv = [
  "GDRIVE_SERVICE_ACCOUNT_JSON",
  "GDRIVE_FOLDER_ID",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const ensureEnv = () =>
  requiredEnv.every((key) => Boolean(process.env[key]));

const toCsv = (rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => escape(row[key])).join(","));
  }
  return lines.join("\n");
};

const fetchAll = async (table: string) => {
  const { data, error } = await supabaseServer.from(table).select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
};

const driveClient = () => {
  const raw = process.env.GDRIVE_SERVICE_ACCOUNT_JSON ?? "";
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
};

const uploadFile = async (name: string, content: string) => {
  const drive = driveClient();
  const folderId = process.env.GDRIVE_FOLDER_ID as string;

  const response = await drive.files.create({
    requestBody: {
      name,
      parents: [folderId],
    },
    media: {
      mimeType: "text/csv",
      body: content,
    },
    fields: "id",
  });

  return response.data.id ?? null;
};

export async function GET() {
  if (!hasSupabaseServerConfig || !ensureEnv()) {
    return NextResponse.json(
      { ok: false, error: "Missing backup configuration." },
      { status: 500 }
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tables = ["products", "customers", "sales", "news_articles"];

  const results: Record<string, string | null> = {};
  try {
    for (const table of tables) {
      const rows = await fetchAll(table);
      const csv = toCsv(rows as Array<Record<string, unknown>>);
      const fileId = await uploadFile(`${table}-${timestamp}.csv`, csv);
      results[table] = fileId;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, files: results });
}
