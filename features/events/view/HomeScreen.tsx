import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { HeroContentView, PublicCategory, PublicEvent } from "@/features/events/model/events.types";
import { EventGrid, canOptimize } from "@/features/events/view/EventPoster";
import { HeroSlider } from "@/features/events/view/HeroSlider";
import { selectHeroSlides } from "@/features/events/model/heroSlides";
import { REGION_FILTERS } from "@/lib/regions";

type HomeScreenProps = {
  hero: HeroContentView;
  featured: PublicEvent[];
  upcoming: PublicEvent[];
  categories: PublicCategory[];
};

export function HomeScreen({ hero, featured, upcoming, categories }: HomeScreenProps) {
  const renderedAt = new Date().toISOString();
  // The slider shows the 5 soonest upcoming events; with none, the static
  // hero from Admin → Content is shown instead.
  const hasSlides = selectHeroSlides(upcoming, new Date(renderedAt)).length > 0;

  return (
    <>
      {hasSlides ? (
        <>
          <h1 className="sr-only">{hero.title}</h1>
          <HeroSlider events={upcoming} renderedAt={renderedAt} />
        </>
      ) : (
        <StaticHero hero={hero} />
      )}

      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-12 sm:px-6">
        <div className="grid gap-4">
          {categories.length > 0 ? (
            <nav aria-label="Browse by category">
              <ul className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/events?category=${encodeURIComponent(category.slug)}`}
                      className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent-text"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <nav aria-label="Browse by region">
            <ul className="flex flex-wrap gap-2">
              {REGION_FILTERS.filter((region) => region.id).map((region) => (
                <li key={region.id}>
                  <Link
                    href={`/events?region=${region.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold hover:text-accent-text"
                  >
                    <span aria-hidden>🌏</span>
                    {region.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {featured.length > 0 ? (
          <section aria-labelledby="featured-heading" className="grid gap-5">
            <h2 id="featured-heading" className="text-2xl font-extrabold tracking-tight">
              Featured
            </h2>
            <EventGrid events={featured} priorityCount={hasSlides ? 0 : 3} />
          </section>
        ) : null}

        <section aria-labelledby="upcoming-heading" className="grid gap-5">
          <div className="flex items-end justify-between gap-4">
            <h2 id="upcoming-heading" className="text-2xl font-extrabold tracking-tight">
              Upcoming events
            </h2>
            {upcoming.length > 0 ? (
              <Link href="/events" className="text-sm font-semibold text-accent-text hover:underline">
                See all events →
              </Link>
            ) : null}
          </div>
          {upcoming.length > 0 ? (
            <EventGrid events={upcoming} priorityCount={hasSlides || featured.length > 0 ? 0 : 3} />
          ) : (
            <EmptyState icon="🎟" title="No upcoming events yet" description="New events are added regularly. Check back soon." />
          )}
        </section>
      </div>
    </>
  );
}

function StaticHero({ hero }: { hero: HeroContentView }) {
  return (
    <section className="relative isolate overflow-hidden">
      {hero.imageSrc ? (
        <Image
          src={hero.imageSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          unoptimized={!canOptimize(hero.imageSrc)}
          className="-z-20 object-cover"
        />
      ) : null}
      {/* Darkening gradient keeps the headline readable on any image. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/80 to-bg/40" />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{hero.title}</h1>
        {hero.subtitle ? <p className="max-w-2xl text-lg text-muted sm:text-xl">{hero.subtitle}</p> : null}
        <div>
          <ButtonLink href="/events" size="lg">
            {hero.ctaText}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
