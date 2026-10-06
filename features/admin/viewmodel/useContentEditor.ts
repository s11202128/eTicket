"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { publicImageUrl, uploadImage, validateImage } from "@/lib/storage";
import {
  DEFAULT_ANNOUNCEMENT,
  DEFAULT_HERO,
  getFeaturedEditorData,
  getSiteContent,
  saveAnnouncement,
  saveFeaturedOrder,
  saveHero,
} from "@/features/admin/model/content.repository";
import type { AnnouncementContent, EventOption, HeroContent } from "@/features/admin/model/admin.types";

type Section = "hero" | "announcement" | "featured";

export function useContentEditor() {
  const toast = useToast();
  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO);
  const [announcement, setAnnouncement] = useState<AnnouncementContent>(DEFAULT_ANNOUNCEMENT);
  const [featured, setFeatured] = useState<EventOption[]>([]);
  const [candidates, setCandidates] = useState<EventOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Section | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [content, featuredData] = await Promise.all([getSiteContent(), getFeaturedEditorData()]);
      setHero(content.hero);
      setAnnouncement(content.announcement);
      setFeatured(featuredData.featured);
      setCandidates(featuredData.candidates);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Couldn't load site content.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onHeroImage = async (file: File | undefined) => {
    if (!file) return;
    const problem = validateImage(file, "site-images");
    if (problem) {
      setHeroError(problem);
      return;
    }
    setHeroError(null);
    setIsUploading(true);
    const result = await uploadImage("site-images", file, "hero");
    setIsUploading(false);
    if (!result.ok) {
      setHeroError(result.errorMessage);
      return;
    }
    setHero((current) => ({ ...current, imagePath: result.path }));
  };

  const onSaveHero = async () => {
    if (!hero.title.trim()) {
      setHeroError("The headline can't be empty.");
      return;
    }
    setSaving("hero");
    const result = await saveHero({
      ...hero,
      title: hero.title.trim(),
      subtitle: hero.subtitle.trim(),
      ctaText: hero.ctaText.trim() || DEFAULT_HERO.ctaText,
    });
    setSaving(null);
    if (result.ok) toast.success("Homepage hero saved.");
    else toast.error(result.errorMessage);
  };

  const onSaveAnnouncement = async () => {
    if (announcement.enabled && !announcement.text.trim()) {
      toast.error("Add announcement text or turn the bar off.");
      return;
    }
    setSaving("announcement");
    const result = await saveAnnouncement({ ...announcement, text: announcement.text.trim() });
    setSaving(null);
    if (result.ok) toast.success("Announcement bar saved.");
    else toast.error(result.errorMessage);
  };

  const moveFeatured = (from: number, to: number) => {
    if (to < 0 || to >= featured.length || from === to) return;
    setFeatured((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const addFeatured = (eventId: string) => {
    const event = candidates.find((candidate) => candidate.id === eventId);
    if (!event) return;
    setFeatured((current) => [...current, event]);
    setCandidates((current) => current.filter((candidate) => candidate.id !== eventId));
  };

  const removeFeatured = (eventId: string) => {
    const event = featured.find((item) => item.id === eventId);
    if (!event) return;
    setFeatured((current) => current.filter((item) => item.id !== eventId));
    if (event.status === "published") {
      setCandidates((current) => [...current, event].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    }
  };

  const onSaveFeatured = async () => {
    setSaving("featured");
    const result = await saveFeaturedOrder(featured.map((event) => event.id));
    setSaving(null);
    if (result.ok) toast.success("Featured events saved.");
    else toast.error(result.errorMessage);
  };

  return {
    isLoading,
    loadError,
    reload: load,
    saving,
    hero,
    setHero,
    heroError,
    heroImageUrl: hero.imagePath ? publicImageUrl("site-images", hero.imagePath) : null,
    isUploading,
    onHeroImage,
    onSaveHero,
    announcement,
    setAnnouncement,
    onSaveAnnouncement,
    featured,
    candidates,
    moveFeatured,
    addFeatured,
    removeFeatured,
    onSaveFeatured,
  };
}
