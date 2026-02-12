import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = "https://vknopcdmkhpfqhzmwysj.supabase.co";
const CROSSINGS_BUCKET = "crossings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    const supabase = createClient(supabaseUrl, key);

    const { data, error } = await supabase.storage
      .from(CROSSINGS_BUCKET)
      .list("", { limit: 100 });

    if (error) {
      console.error("List crossings error:", error.message);
      return NextResponse.json({ urls: [] });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ urls: [] });
    }

    // Sort by name descending (filenames contain timestamps)
    const pngFiles = data
      .filter((file) => file.name.endsWith(".png"))
      .sort((a, b) => b.name.localeCompare(a.name));

    const urls = pngFiles.map((file) => {
      const { data: urlData } = supabase.storage
        .from(CROSSINGS_BUCKET)
        .getPublicUrl(file.name);
      return urlData.publicUrl;
    });

    return NextResponse.json({ urls });
  } catch (err) {
    console.error("Crossings handler error:", err);
    return NextResponse.json({ urls: [] });
  }
}
