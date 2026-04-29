import { NextResponse } from "next/server";

const supabaseUrl = "https://smytgqkgomsfyurskpcl.supabase.co";
const CROSSINGS_BUCKET = "becoming-border-crossings";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    // Use raw fetch instead of Supabase SDK — the SDK's .list() returns
    // partial results on Vercel's Node.js 24 runtime. cache:"no-store"
    // is critical: Next.js's data cache otherwise pins fetch results,
    // freezing the gallery to whichever bucket snapshot was first hit.
    const resp = await fetch(
      `${supabaseUrl}/storage/v1/object/list/${CROSSINGS_BUCKET}`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prefix: "",
          limit: 1000,
          offset: 0,
          sortBy: { column: "name", order: "desc" },
        }),
      },
    );

    if (!resp.ok) {
      console.error("List crossings error:", resp.status, await resp.text());
      return NextResponse.json({ urls: [] });
    }

    const files: { name: string }[] = await resp.json();

    const urls = files
      .filter((f) => f.name.endsWith(".png") && !f.name.startsWith("."))
      .sort((a, b) => b.name.localeCompare(a.name))
      .map(
        (f) =>
          `${supabaseUrl}/storage/v1/object/public/${CROSSINGS_BUCKET}/${f.name}`,
      );

    return NextResponse.json({ urls });
  } catch (err) {
    console.error("Crossings handler error:", err);
    return NextResponse.json({ urls: [] });
  }
}
