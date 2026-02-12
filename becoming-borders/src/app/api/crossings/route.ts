import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = "https://vknopcdmkhpfqhzmwysj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const CROSSINGS_BUCKET = "crossings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log("Crossings: hasKey =", hasKey, "keyLen =", (process.env.SUPABASE_SERVICE_ROLE_KEY || "").length);

    const { data, error } = await supabaseAdmin.storage
      .from(CROSSINGS_BUCKET)
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    console.log("Crossings list result:", JSON.stringify({ data, error }));

    if (error) {
      console.error("List crossings error:", error.message);
      return NextResponse.json({ urls: [], debug: { error: error.message, hasKey } });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ urls: [], debug: { dataNull: !data, dataLen: data?.length, hasKey } });
    }

    const urls = data
      .filter((file) => file.name.endsWith(".png"))
      .map((file) => {
        const { data: urlData } = supabaseAdmin.storage
          .from(CROSSINGS_BUCKET)
          .getPublicUrl(file.name);
        return urlData.publicUrl;
      });

    return NextResponse.json({ urls, debug: { totalFiles: data.length, pngFiles: urls.length, hasKey } });
  } catch (err) {
    console.error("Crossings handler error:", err);
    return NextResponse.json({ urls: [], debug: { caught: String(err) } });
  }
}
