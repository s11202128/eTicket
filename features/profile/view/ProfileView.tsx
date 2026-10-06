import Image from "next/image";
import Link from "next/link";
import { isHttpUrl } from "@/lib/format";
import styles from "@/features/shell/view/Content.module.css";
import dashboardStyles from "@/features/dashboard/view/DashboardView.module.css";

type ProfileViewProps = {
  isLoading: boolean;
  loadError: string | null;
  email: string;
  fullName: string;
  avatarUrl: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onFullNameChange: (value: string) => void;
  onAvatarUrlChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function ProfileView({
  isLoading,
  loadError,
  email,
  fullName,
  avatarUrl,
  isSubmitting,
  error,
  successMessage,
  onFullNameChange,
  onAvatarUrlChange,
  onSubmit,
}: ProfileViewProps) {
  if (isLoading) {
    return <p className={dashboardStyles.stateText}>Loading profile...</p>;
  }

  if (loadError) {
    return <p className={dashboardStyles.stateText}>{loadError}</p>;
  }

  const previewUrl = avatarUrl.trim();

  return (
    <section className={styles.panel}>
      <div className={styles.pageHeader}>
        <h1>Profile</h1>
        {isHttpUrl(previewUrl) ? (
          <Image
            src={previewUrl}
            alt="Avatar preview"
            width={56}
            height={56}
            className={dashboardStyles.avatar}
            style={{ width: 56, height: 56 }}
            unoptimized
          />
        ) : (
          <span className={dashboardStyles.avatar} style={{ width: 56, height: 56 }} />
        )}
      </div>

      <form
        className={styles.form}
        style={{ marginTop: 16 }}
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <label className={styles.label}>
          Email
          <input className={styles.input} type="email" value={email} disabled />
        </label>
        <label className={styles.label}>
          Full name
          <input
            className={styles.input}
            type="text"
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            autoComplete="name"
          />
        </label>
        <label className={styles.label}>
          Avatar URL (optional)
          <input
            className={styles.input}
            type="url"
            value={avatarUrl}
            onChange={(event) => onAvatarUrlChange(event.target.value)}
            placeholder="https://..."
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

        <div className={styles.row}>
          <button className={styles.primaryBtn} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Profile"}
          </button>
          <Link className={styles.secondaryBtn} href="/forgot-password">
            Change password
          </Link>
        </div>
      </form>
    </section>
  );
}
