"use client";

import Image from "next/image";
import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import type { PublicEvent } from "@/features/events/model/events.types";
import { canOptimize } from "@/features/events/view/EventPoster";
import { useHeroSlider } from "@/features/events/viewmodel/useHeroSlider";

type HeroSliderProps = {
  // Upcoming events; the slider itself picks the 5 soonest that haven't started.
  events: PublicEvent[];
  // Server render time, so the first client render matches the server HTML.
  renderedAt: string;
};

const SWIPE_THRESHOLD_PX = 50;

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

const CONTROL_CLASS =
  "grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function HeroSlider({ events, renderedAt }: HeroSliderProps) {
  const vm = useHeroSlider(events, renderedAt);
  const pointerStartX = useRef<number | null>(null);

  if (vm.count === 0) return null;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      vm.previous();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      vm.next();
    }
  };

  // Basic touch swipe.
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") pointerStartX.current = event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (pointerStartX.current === null) return;
    const delta = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (delta > SWIPE_THRESHOLD_PX) vm.previous();
    else if (delta < -SWIPE_THRESHOLD_PX) vm.next();
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Upcoming events"
      onKeyDown={onKeyDown}
      onMouseEnter={() => vm.setIsHovered(true)}
      onMouseLeave={() => vm.setIsHovered(false)}
      onFocus={() => vm.setHasFocus(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) vm.setHasFocus(false);
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (pointerStartX.current = null)}
      // Panoramic ~3:1 on larger screens (about 500–600px tall on desktop);
      // taller on phones so the text still fits.
      className="relative isolate h-[min(78vh,460px)] min-h-[360px] w-full touch-pan-y overflow-hidden bg-black text-white sm:h-auto sm:min-h-[420px] sm:aspect-[3/1] lg:max-h-[600px]"
    >
      {/* Slides: a horizontal track moved with translateX. */}
      <div
        aria-live={vm.isAutoAdvancing ? "off" : "polite"}
        className={cn(
          "flex h-full",
          !vm.reducedMotion && "transition-transform duration-700 ease-out motion-reduce:transition-none"
        )}
        style={{ transform: `translateX(-${vm.current * 100}%)` }}
      >
        {vm.slides.map((event, slideIndex) => {
          const isActive = slideIndex === vm.current;
          return (
            <div
              key={event.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${vm.count}: ${event.title}`}
              aria-hidden={!isActive}
              inert={!isActive}
              className="relative isolate h-full w-full shrink-0"
            >
              {/* object-fit: cover fills the frame without stretching, centred. */}
              <Image
                src={event.imageSrc}
                alt=""
                fill
                sizes="100vw"
                priority={slideIndex === 0}
                unoptimized={!canOptimize(event.imageSrc)}
                className="-z-10 object-cover object-center"
              />
              {/* Dark gradients keep white text readable on any image. */}
              <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%), linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)",
                }}
              />

              <div className="mx-auto flex h-full max-w-6xl flex-col justify-end gap-3 px-4 pb-20 pt-10 sm:px-6 sm:pb-24 lg:pb-28">
                {event.categoryName ? (
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/85">{event.categoryName}</p>
                ) : null}
                <h2 className="max-w-3xl text-3xl font-extrabold leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.5)] sm:text-5xl">
                  {event.title}
                </h2>
                <p className="text-base font-semibold text-white/90 sm:text-lg">
                  <LocalDateTime iso={event.startsAt} format="dateTime" />
                  <span aria-hidden> · </span>
                  {event.location}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <ButtonLink href={`/events/${event.slug}`} size="lg" className="shadow-lg">
                    {event.isSoldOut ? "View event" : "Book Now"}
                    <span className="sr-only">: {event.title}</span>
                  </ButtonLink>
                  <span className="text-lg font-bold">{event.isSoldOut ? "Sold out" : formatPrice(event.price)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {vm.count > 1 ? (
        <>
          <button
            type="button"
            onClick={vm.previous}
            aria-label="Previous slide"
            className={cn(CONTROL_CLASS, "absolute left-3 top-1/2 -translate-y-1/2 sm:left-5")}
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={vm.next}
            aria-label="Next slide"
            className={cn(CONTROL_CLASS, "absolute right-3 top-1/2 -translate-y-1/2 sm:right-5")}
          >
            <ArrowIcon direction="right" />
          </button>

          <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={vm.togglePlay}
              aria-label={vm.isPlaying ? "Pause slideshow" : "Play slideshow"}
              className={cn(CONTROL_CLASS, "size-9")}
            >
              {vm.isPlaying ? (
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
                  <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                </svg>
              ) : (
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div role="group" aria-label="Choose slide" className="flex items-center gap-2">
              {vm.slides.map((event, slideIndex) => {
                const isActive = slideIndex === vm.current;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => vm.goTo(slideIndex)}
                    aria-label={`Go to slide ${slideIndex + 1}: ${event.title}`}
                    aria-current={isActive ? "true" : undefined}
                    className="grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "block h-2.5 rounded-full transition-all",
                        isActive ? "w-7 bg-accent" : "w-2.5 bg-white/60 hover:bg-white"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
