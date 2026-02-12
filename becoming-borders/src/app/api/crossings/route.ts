import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = "https://vknopcdmkhpfqhzmwysj.supabase.co";
const CROSSINGS_BUCKET = "crossings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const key = rawKey.trim();

    // Create client fresh inside handler
    const supabase = createClient(supabaseUrl, key);

    const { data, error } = await supabase.storage
      .from(CROSSINGS_BUCKET)
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    console.log("Crossings debug:", JSON.stringify({
      rawLen: rawKey.length,
      trimmedLen: key.length,
      keyPrefix: key.substring(0, 12),
      keySuffix: key.substring(key.length - 5),
      error: error?.message || null,
      fileCount: data?.length ?? null,
      fileNames: data?.map(f => f.name) ?? null,
    }));

    if (error) {
      return NextResponse.json({
        urls: [],
        debug: { error: error.message, rawLen: rawKey.length, trimmedLen: key.length },
      });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        urls: [],
        debug: { empty: true, rawLen: rawKey.length, trimmedLen: key.length, keyPrefix: key.substring(0, 12), keySuffix: key.substring(key.length - 5) },
      });
    }

    const urls = data
      .filter((file) => file.name.endsWith(".png"))
      .map((file) => {
        const { data: urlData } = supabase.storage
          .from(CROSSINGS_BUCKET)
          .getPublicUrl(file.name);
        return urlData.publicUrl;
      });

    return NextResponse.json({ urls });
  } catch (err) {
    return NextResponse.json({
      urls: [],
      debug: { caught: String(err) },
    });
  }
}
