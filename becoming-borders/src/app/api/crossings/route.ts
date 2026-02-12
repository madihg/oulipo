import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = "https://vknopcdmkhpfqhzmwysj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const CROSSINGS_BUCKET = "crossings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(CROSSINGS_BUCKET)
      .list("", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.error("List crossings error:", error.message);
      return NextResponse.json({ urls: [] });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ urls: [] });
    }

    const urls = data
      .filter((file) => file.name.endsWith(".png"))
      .map((file) => {
        const { data: urlData } = supabaseAdmin.storage
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
