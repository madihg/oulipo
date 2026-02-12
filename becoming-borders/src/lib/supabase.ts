import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vknopcdmkhpfqhzmwysj.supabase.co";
const supabaseAnonKey = "sb_publishable_KQpPKu0i_HmnZUyI5fXZoA_yNcbBvgj";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const CROSSINGS_BUCKET = "crossings";

/**
 * Upload a canvas blob to the crossings bucket via the server-side API route.
 * This keeps the service role key on the server and bypasses RLS.
 * Returns the public URL of the uploaded image, or null on failure.
 */
export async function uploadCrossing(blob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", blob, `crossing-${Date.now()}.png`);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Failed to upload crossing:", err.error);
      return null;
    }

    const { url } = await response.json();
    return url;
  } catch (err) {
    console.error("Upload crossing error:", err);
    return null;
  }
}

/**
 * Fetch all crossing image URLs from the bucket.
 * The bucket is public, so listing with the anon key works for reads.
 * Returns newest first.
 */
export async function fetchCrossings(): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(CROSSINGS_BUCKET)
    .list("", {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    console.error("Failed to fetch crossings:", error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  return data
    .filter((file) => file.name.endsWith(".png"))
    .map((file) => {
      const { data: urlData } = supabase.storage
        .from(CROSSINGS_BUCKET)
        .getPublicUrl(file.name);
      return urlData.publicUrl;
    });
}
