import type { DashboardData } from "@/features/dashboard/model/dashboard.types";

export const dashboardData: DashboardData = {
  appName: "E-Ticket",
  userName: "John",
  userAvatar:
    "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=120&q=80",
  notifications: 3,
  sidebarItems: [
    { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", active: true },
    { id: "tickets", label: "My Tickets", href: "#", icon: "ticket" },
    { id: "events", label: "Events", href: "#", icon: "event" },
    { id: "profile", label: "Profile", href: "#", icon: "profile" },
    { id: "logout", label: "Logout", href: "/login", icon: "logout" },
  ],
  stats: [
    {
      id: "active-tickets",
      title: "Active Tickets",
      value: 5,
      subtitle: "Ready to use this week",
      icon: "ticket",
    },
    {
      id: "upcoming-events",
      title: "Upcoming Events",
      value: 3,
      subtitle: "Scheduled in your city",
      icon: "calendar",
    },
    {
      id: "expired-tickets",
      title: "Expired Tickets",
      value: 2,
      subtitle: "From previous events",
      icon: "clock",
    },
  ],
  nextEvent: {
    title: "Music Fest 2022",
    dateTime: "Sat, 20 Aug 2022 - 7:00 PM",
    location: "Downtown Arena",
    imageUrl:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=80",
    ctaLabel: "View Details",
  },
  recentTickets: [
    {
      id: "ticket-1",
      eventTitle: "Neon Summer Night",
      date: "15 Aug 2022",
      location: "Skyline Hall",
      status: "Active",
      qrImageUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=ETICKET-ACTIVE-001",
    },
    {
      id: "ticket-2",
      eventTitle: "Jazz Under Lights",
      date: "01 Jul 2022",
      location: "Blue Stage",
      status: "Used",
      qrImageUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=ETICKET-USED-002",
    },
  ],
  upcomingEvents: [
    {
      id: "event-1",
      title: "City Rock Live",
      date: "22 Aug 2022",
      price: "$45",
      imageUrl:
        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "event-2",
      title: "Sunset DJ Party",
      date: "03 Sep 2022",
      price: "$32",
      imageUrl:
        "https://images.unsplash.com/photo-1571266028243-1f2db4b79de4?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "event-3",
      title: "Acoustic Garden",
      date: "12 Sep 2022",
      price: "$25",
      imageUrl:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
    },
  ],
};
