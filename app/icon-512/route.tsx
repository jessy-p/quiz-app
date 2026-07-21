import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/appIconMark";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(<AppIconMark size={512} />, size);
}
