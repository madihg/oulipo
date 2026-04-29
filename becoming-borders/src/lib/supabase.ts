const BASE_PATH = "/becoming-crossings";

/**
 * Upload a canvas blob to the crossings bucket via the server-side API route.
 * Returns the public URL of the uploaded image, or null on failure.
 */
export async function uploadCrossing(blob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", blob, `crossing-${Date.now()}.png`);

    const response = await fetch(`${BASE_PATH}/api/upload`, {
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
 * Fetch all crossing image URLs via the server-side API route.
 * The anon key can't list files (RLS), so we go through the server.
 * Returns newest first.
 */
export async function fetchCrossings(): Promise<string[]> {
  try {
    // cache: "no-store" + a fresh ts query param defeat both the
    // browser HTTP cache and any intermediary proxies, so a brand-new
    // crossing surfaces immediately the moment its uploader visits the
    // gallery.
    const response = await fetch(
      `${BASE_PATH}/api/crossings?ts=${Date.now()}`,
      { cache: "no-store" },
    );
    if (!response.ok) return [];
    const { urls } = await response.json();
    return urls || [];
  } catch (err) {
    console.error("Fetch crossings error:", err);
    return [];
  }
}
