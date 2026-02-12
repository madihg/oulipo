import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = "https://vknopcdmkhpfqhzmwysj.supabase.co";
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const CROSSINGS_BUCKET = "crossings";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = `crossing-${Date.now()}.png`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabaseAdmin.storage
      .from(CROSSINGS_BUCKET)
      .upload(filename, buffer, {
        contentType: "image/png",
        cacheControl: "3600",
      });

    if (error) {
      console.error("Upload error:", error.message);
      return NextResponse.json(
        { error: "Failed to upload" },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage
      .from(CROSSINGS_BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("Upload handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
