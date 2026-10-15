import { appIconResponse } from "@/lib/appIcon";

// iOS home-screen icon (iOS adds the rounded corners).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIconResponse(size.width);
}
