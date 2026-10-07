import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function EventNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        icon="🎟"
        title="Event not found"
        description="This event doesn't exist, isn't published yet, or the link is wrong."
        action={<ButtonLink href="/events">Browse events</ButtonLink>}
      />
    </div>
  );
}
