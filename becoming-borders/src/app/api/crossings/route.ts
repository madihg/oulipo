import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = "https://vknopcdmkhpfqhzmwysj.supabase.co";
const CROSSINGS_BUCKET = "crossings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Use env var with trim, fallback to hardcoded for debugging
    const envKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    const hardcodedKey = "REMOVED_SECRET";
    const key = envKey || hardcodedKey;

    const supabase = createClient(supabaseUrl, key);

    // Try listing with different parameters
    const { data: data1, error: error1 } = await supabase.storage
      .from(CROSSINGS_BUCKET)
      .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

    const { data: data2, error: error2 } = await supabase.storage
      .from(CROSSINGS_BUCKET)
      .list();

    // Also try a direct fetch to Supabase storage API
    let directResult = null;
    try {
      const resp = await fetch(`${supabaseUrl}/storage/v1/object/list/${CROSSINGS_BUCKET}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "apikey": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefix: "", limit: 100 }),
      });
      const text = await resp.text();
      directResult = { status: resp.status, body: text.substring(0, 500) };
    } catch (e) {
      directResult = { error: String(e) };
    }

    return NextResponse.json({
      sdkWithSort: { count: data1?.length ?? null, error: error1?.message ?? null, names: data1?.map(f => f.name) ?? null },
      sdkNoSort: { count: data2?.length ?? null, error: error2?.message ?? null, names: data2?.map(f => f.name) ?? null },
      direct: directResult,
      keyUsed: key === envKey ? "env" : "hardcoded",
      keyLen: key.length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
