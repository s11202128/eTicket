import Link from "next/link";
import styles from "@/features/auth/view/AuthCard.module.css";

type CreateEventViewProps = {
  title: string;
  description: string;
  startsAt: string;
  location: string;
  price: string;
  imageUrl: string;
  isSubmitting: boolean;
  error: string | null;
  isFormValid: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStartsAtChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function CreateEventView({
  title,
  description,
  startsAt,
  location,
  price,
  imageUrl,
  isSubmitting,
  error,
  isFormValid,
  onTitleChange,
  onDescriptionChange,
  onStartsAtChange,
  onLocationChange,
  onPriceChange,
  onImageUrlChange,
  onSubmit,
}: CreateEventViewProps) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.left}>
          <h1 className={styles.title}>Create Event</h1>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <input
              className={styles.input}
              id="event-title"
              type="text"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Event title"
              required
            />
            <textarea
              className={styles.input}
              id="event-description"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Description (optional)"
              rows={3}
            />
            <input
              className={styles.input}
              id="event-starts-at"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => onStartsAtChange(event.target.value)}
              aria-label="Date and time"
              required
            />
            <input
              className={styles.input}
              id="event-location"
              type="text"
              value={location}
              onChange={(event) => onLocationChange(event.target.value)}
              placeholder="Location"
              required
            />
            <input
              className={styles.input}
              id="event-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => onPriceChange(event.target.value)}
              placeholder="Price (0 for free)"
              aria-label="Price"
              required
            />
            <input
              className={styles.input}
              id="event-image-url"
              type="url"
              value={imageUrl}
              onChange={(event) => onImageUrlChange(event.target.value)}
              placeholder="Image URL (optional)"
            />
            <button className={styles.primaryButton} type="submit" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "SAVING..." : "SAVE EVENT"}
            </button>
          </form>

          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <aside className={styles.right}>
          <p className={styles.panelText}>Events you save here appear on the dashboard for everyone to book.</p>
          <Link className={styles.outlineButton} href="/dashboard">
            DASHBOARD
          </Link>
        </aside>
      </section>
    </main>
  );
}
