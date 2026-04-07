import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Home Page</h1>
      <p>Your app is now routing correctly.</p>
      <Link href="/dashboard">Go to Dashboard</Link>
    </main>
  );
}
