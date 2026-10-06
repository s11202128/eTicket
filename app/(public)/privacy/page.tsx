import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { InfoPage } from "@/features/site/view/InfoPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro={`What information ${siteConfig.name} collects and how it is used.`}
      templateFile="app/(public)/privacy/page.tsx"
    >
      <h2>Information we collect</h2>
      <ul>
        <li>Account details: your email address, and your name and profile picture if you add them.</li>
        <li>Bookings: the events you book, your ticket codes and when tickets are checked in.</li>
        <li>Notifications we send you and whether you have read them.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create your tickets and let venue staff check them in. Staff see your name when scanning.</li>
        <li>To send booking confirmations and important updates, such as event changes or cancellations.</li>
        <li>To keep the service secure and prevent misuse.</li>
      </ul>

      <h2>Who can see your information</h2>
      <p>
        Only you can see your tickets. Our administrators can see bookings to run events. We do not sell your
        personal information. [List any other services you share data with.]
      </p>

      <h2>Your choices</h2>
      <p>
        You can update your name and picture on your <Link href="/profile">profile</Link>. To delete your account,{" "}
        <Link href="/contact">contact us</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions? <Link href="/contact">Contact us</Link>.
      </p>
    </InfoPage>
  );
}
