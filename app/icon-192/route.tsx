import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/appIconMark";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(<AppIconMark size={192} />, size);
}
