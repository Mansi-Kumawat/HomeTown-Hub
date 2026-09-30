// POST /api/upload — receive ONE image and return a URL to display.
//
// Two storage strategies, chosen automatically:
//  1. CLOUDINARY (recommended): if CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET
//     are set in .env, we upload the file to Cloudinary and return its https URL.
//     (Free keys: cloudinary.com → Sign up → Dashboard → "Account Details".)
//  2. FALLBACK data-URL: with no keys, the image is converted to a base64
//     data URL and stored directly in the database text column — perfect for
//     learning and demos, swap in Cloudinary before real production traffic.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthUser } from "@/lib/session";
import { ok, fail } from "@/lib/http";

const MAX_BYTES = 2.5 * 1024 * 1024; // 2.5 MB keeps base64 rows reasonable
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Upload a buffer to Cloudinary using a signed (server-side) request. */
async function uploadToCloudinary(buffer: Buffer, mime: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  // Cloudinary signs params with SHA-1 of "key=value&..." + secret.
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=hometown-hub&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mime }));
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", "hometown-hub");
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.secure_url) throw new Error(data?.error?.message || "Cloudinary upload failed");
  return data.secure_url as string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Please choose an image to upload.");
  if (!ALLOWED.includes(file.type)) return fail("Only JPG, PNG, WebP or GIF images are allowed.");
  if (file.size > MAX_BYTES) return fail("Image is too large. Please keep it under 2.5 MB.");

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const url = await uploadToCloudinary(buffer, file.type);
      return ok({ url }, "Image uploaded.");
    }
    // Fallback: base64 data URL stored in the database.
    const url = `data:${file.type};base64,${buffer.toString("base64")}`;
    return ok({ url }, "Image uploaded.");
  } catch (error) {
    console.error("Upload error:", error);
    return fail("Image upload failed. Please try another image.", 500);
  }
}
