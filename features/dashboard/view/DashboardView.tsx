import type { DashboardStat } from "@/features/dashboard/model/dashboard.types";

type DashboardViewProps = {
  title: string;
  lastUpdated: string;
  stats: DashboardStat[];
  statusMessage: string;
  isLoading: boolean;
  error: string | null;
};

export function DashboardView({
  title,
  lastUpdated,
  stats,
  statusMessage,
  isLoading,
  error,
}: DashboardViewProps) {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>{title}</h1>
      {lastUpdated ? <p>Last updated: {lastUpdated}</p> : null}

      {isLoading ? <p>Loading dashboard...</p> : null}
      {error ? <p>{error}</p> : null}

      {!isLoading && !error ? (
        <>
          <p>{statusMessage}</p>
          <section
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginTop: "1rem",
            }}
          >
            {stats.map((stat) => (
              <article
                key={stat.label}
                style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem" }}
              >
                <h2 style={{ margin: 0, fontSize: "1rem" }}>{stat.label}</h2>
                <p style={{ fontSize: "1.5rem", margin: "0.5rem 0 0" }}>{stat.value}</p>
                <p style={{ margin: "0.25rem 0 0", textTransform: "capitalize" }}>Trend: {stat.trend}</p>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}
