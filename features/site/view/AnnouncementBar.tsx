import type { AnnouncementView } from "@/features/events/model/events.types";

export function AnnouncementBar({ announcement }: { announcement: AnnouncementView }) {
  if (!announcement.enabled || !announcement.text.trim()) return null;

  return (
    <div className="bg-accent text-on-accent">
      <p className="mx-auto max-w-6xl px-4 py-2 text-center text-sm font-semibold sm:px-6">{announcement.text}</p>
    </div>
  );
}
