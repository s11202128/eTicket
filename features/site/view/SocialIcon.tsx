import type { SocialPlatform } from "@/lib/siteConfig";

// Simple monochrome brand glyphs (24×24), coloured by the surrounding text.
const PATHS: Record<SocialPlatform, string> = {
  facebook:
    "M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9Z",
  instagram:
    "M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.8-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM20.9 8c-.1-1.4-.4-2.7-1.4-3.6-1-1-2.2-1.3-3.6-1.4-1.4-.1-5.6-.1-7.1 0-1.4.1-2.6.4-3.6 1.4S3.9 6.6 3.8 8c-.1 1.4-.1 5.6 0 7.1.1 1.4.4 2.6 1.4 3.6s2.2 1.3 3.6 1.4c1.4.1 5.6.1 7.1 0 1.4-.1 2.7-.4 3.6-1.4 1-1 1.3-2.2 1.4-3.6.1-1.4.1-5.6 0-7.1Zm-1.8 8.6a2.9 2.9 0 0 1-1.6 1.6c-1.1.4-3.8.3-5.1.3s-4 .1-5.1-.3a2.9 2.9 0 0 1-1.6-1.6c-.4-1.1-.3-3.8-.3-5.1s-.1-4 .3-5.1a2.9 2.9 0 0 1 1.6-1.6c1.1-.4 3.8-.3 5.1-.3s4-.1 5.1.3a2.9 2.9 0 0 1 1.6 1.6c.4 1.1.3 3.8.3 5.1s.1 4-.3 5.1Z",
  x: "M17.8 3.5h3l-6.6 7.5 7.7 10.2h-6l-4.7-6.2-5.4 6.2h-3l7-8L2.4 3.5h6.2l4.3 5.7 4.9-5.7Zm-1 15.9h1.7L7.3 5.2H5.5l11.3 14.2Z",
  tiktok:
    "M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.2v12.6a2.6 2.6 0 1 1-1.9-2.5V9.8a5.8 5.8 0 1 0 5.1 5.8V9.2a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6Z",
  youtube:
    "M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z",
  linkedin:
    "M6.9 8.5H3.6V20h3.3V8.5ZM5.3 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM20.4 13.4c0-3-1.6-5.1-4.4-5.1a3.8 3.8 0 0 0-3.4 1.9V8.5H9.4V20h3.3v-6c0-1.6.6-2.8 2.2-2.8 1.5 0 2.1 1.2 2.1 2.9V20h3.4v-6.6Z",
};

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X (Twitter)",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export function SocialIcon({ platform }: { platform: SocialPlatform }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d={PATHS[platform]} />
    </svg>
  );
}
