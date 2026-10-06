import { getHomeData } from "@/features/events/model/publicEvents.server";
import { HomeScreen } from "@/features/events/view/HomeScreen";

export default async function HomePage() {
  const data = await getHomeData();
  return <HomeScreen {...data} />;
}
