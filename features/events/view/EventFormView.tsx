import Link from "next/link";
import styles from "@/features/shell/view/Content.module.css";
import dashboardStyles from "@/features/dashboard/view/DashboardView.module.css";

type EventFormViewProps = {
  mode: "create" | "edit";
  isLoading: boolean;
  loadError: string | null;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  price: string;
  capacity: string;
  imageUrl: string;
  isSubmitting: boolean;
  error: string | null;
  isFormValid: boolean;
  cancelHref: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStartsAtChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onCapacityChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function EventFormView({
  mode,
  isLoading,
  loadError,
  title,
  description,
  startsAt,
  location,
  price,
  capacity,
  imageUrl,
  isSubmitting,
  error,
  isFormValid,
  cancelHref,
  onTitleChange,
  onDescriptionChange,
  onStartsAtChange,
  onLocationChange,
  onPriceChange,
  onCapacityChange,
  onImageUrlChange,
  onSubmit,
}: EventFormViewProps) {
  if (isLoading) {
    return <p className={dashboardStyles.stateText}>Loading event...</p>;
  }

  if (loadError) {
    return <p className={dashboardStyles.stateText}>{loadError}</p>;
  }

  return (
    <section className={styles.panel}>
      <div className={styles.pageHeader}>
        <h1>{mode === "edit" ? "Edit Event" : "Create Event"}</h1>
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <label className={styles.label}>
          Title
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            required
          />
        </label>
        <label className={styles.label}>
          Description (optional)
          <textarea
            className={styles.input}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={4}
          />
        </label>
        <label className={styles.label}>
          Date and time
          <input
            className={styles.input}
            type="datetime-local"
            value={startsAt}
            onChange={(event) => onStartsAtChange(event.target.value)}
            required
          />
        </label>
        <label className={styles.label}>
          Location
          <input
            className={styles.input}
            type="text"
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            required
          />
        </label>
        <label className={styles.label}>
          Price (0 for free)
          <input
            className={styles.input}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => onPriceChange(event.target.value)}
            required
          />
        </label>
        <label className={styles.label}>
          Capacity (leave empty for unlimited)
          <input
            className={styles.input}
            type="number"
            min="1"
            step="1"
            value={capacity}
            onChange={(event) => onCapacityChange(event.target.value)}
          />
        </label>
        <label className={styles.label}>
          Image URL (optional)
          <input
            className={styles.input}
            type="url"
            value={imageUrl}
            onChange={(event) => onImageUrlChange(event.target.value)}
            placeholder="https://..."
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.row}>
          <button className={styles.primaryBtn} type="submit" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Event"}
          </button>
          <Link className={styles.secondaryBtn} href={cancelHref}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
