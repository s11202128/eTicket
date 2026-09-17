import { demoTickets } from "@/lib/demo-data";
import type { Ticket, UserProfile } from "@/features/dashboard/model/dashboard.types";

type DemoState = {
  tickets: Ticket[];
  profile: UserProfile;
};

const demoGlobal = globalThis as typeof globalThis & { __eticketDemoState?: DemoState };

export function getDemoState(): DemoState {
  if (!demoGlobal.__eticketDemoState) {
    demoGlobal.__eticketDemoState = {
      tickets: [...demoTickets],
      profile: {
        displayName: "Alex Morgan",
        email: "alex@example.com",
        phone: "+1 (212) 555-0147",
        avatarUrl: null,
      },
    };
  }

  return demoGlobal.__eticketDemoState;
}
