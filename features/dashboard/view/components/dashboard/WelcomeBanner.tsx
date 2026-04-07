import styles from "@/features/dashboard/view/DashboardView.module.css";

type WelcomeBannerProps = {
  userName: string;
  updatedAt: string;
};

export function WelcomeBanner({ userName, updatedAt }: WelcomeBannerProps) {
  return (
    <section className={styles.welcome}>
      <h1>Welcome Back, {userName}!</h1>
      {updatedAt ? <p className={styles.meta}>Last updated: {updatedAt}</p> : null}
    </section>
  );
}
