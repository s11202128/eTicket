import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Home Page</h1>
      <p>Your app is now routing correctly.</p>
      <p>
        <Link href="/login">Go to Login</Link>
      </p>
      <p>
        <Link href="/signup">Go to Sign Up</Link>
      </p>
      <p>
        <Link href="/dashboard">Go to Dashboard</Link>
      </p>
    </main>
  );
}
