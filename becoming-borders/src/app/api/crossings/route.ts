import { NextResponse } from "next/server";

const supabaseUrl = "https://vknopcdmkhpfqhzmwysj.supabase.co";
const CROSSINGS_BUCKET = "crossings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    // Use raw fetch instead of Supabase SDK — the SDK's .list() returns
    // partial results on Vercel's Node.js 24 runtime.
    const resp = await fetch(
      `${supabaseUrl}/storage/v1/object/list/${CROSSINGS_BUCKET}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefix: "", limit: 200, offset: 0 }),
      }
    );

    if (!resp.ok) {
      console.error("List crossings error:", resp.status, await resp.text());
      return NextResponse.json({ urls: [] });
    }

    const files: { name: string }[] = await resp.json();

    const urls = files
      .filter((f) => f.name.endsWith(".png"))
      .sort((a, b) => b.name.localeCompare(a.name))
      .map(
        (f) =>
          `${supabaseUrl}/storage/v1/object/public/${CROSSINGS_BUCKET}/${f.name}`
      );

    return NextResponse.json({ urls });
  } catch (err) {
    console.error("Crossings handler error:", err);
    return NextResponse.json({ urls: [] });
  }
}
