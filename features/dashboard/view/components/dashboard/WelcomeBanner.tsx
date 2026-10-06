import styles from "@/features/dashboard/view/DashboardView.module.css";

type WelcomeBannerProps = {
  userName: string;
  updatedAt: string;
};

export function WelcomeBanner({ userName, updatedAt }: WelcomeBannerProps) {
  return (
    <section className={styles.welcome}>
      <div><span className={styles.eyebrow}>YOUR WEEK IN LIVE</span><h1>Good to see you, {userName.split(" ")[0]}.</h1></div>
      {updatedAt ? <p className={styles.meta}>Synced {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p> : null}
    </section>
  );
}
