import { Image } from "expo-image";

export const CL = {
  videoCard: "w_1200,h_675,c_fill,f_auto,q_auto", // 16:9, crisp on 3× DPR
  flowMode: "w_1080,h_1350,c_fill,f_auto,q_auto", // portrait fullscreen
  upNext: "w_400,h_320,c_fill,f_auto,q_auto", // 110×90 card slot
} as const;

export function cloudinaryResize(
  url: string | null | undefined,
  transform: string,
): string | undefined {
  if (!url?.includes("res.cloudinary.com/")) return url ?? undefined;
  const uploadIdx = url.indexOf("/upload/");
  if (uploadIdx === -1) return url;
  const base = url.slice(0, uploadIdx + "/upload/".length);
  const after = url.slice(uploadIdx + "/upload/".length);
  // Strip the existing transform (everything before the first "/")
  const slashIdx = after.indexOf("/");
  if (slashIdx === -1) return `${base}${transform}/${after}`;
  return `${base}${transform}/${after.slice(slashIdx + 1)}`;
}

/**
 * Download the exact image sizes SessionScreen displays (not the original
 * URL), so the thumbnails are in the disk cache and show with no signal.
 */
export function prefetchExerciseImages(urls: (string | null | undefined)[]) {
  const all = new Set<string>();
  for (const url of urls) {
    if (!url) continue;
    for (const transform of Object.values(CL)) {
      const resized = cloudinaryResize(url, transform);
      if (resized) all.add(resized);
    }
  }
  if (all.size > 0) Image.prefetch([...all]).catch(() => {});
}
