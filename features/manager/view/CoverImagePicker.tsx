"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { validateImage } from "@/lib/storage";
import { clampOffset, coverScale, sourceRect, type Offset, type Size } from "@/features/manager/model/cropMath";

const OUTPUT: Size = { width: 1600, height: 900 };

type Props = {
  imageSrc: string | null;
  isUploading: boolean;
  disabled?: boolean;
  onCropped: (file: File) => void;
  onRemove: () => void;
};

// Cover image: choose a file, frame it in 16:9 (zoom + drag), upload the crop.
export function CoverImagePicker({ imageSrc, isUploading, disabled, onCropped, onRemove }: Props) {
  const inputId = useId();
  const [source, setSource] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImage(file, "event-images");
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSource({ url: URL.createObjectURL(file), name: file.name });
  };

  const closeCropper = () => {
    if (source) URL.revokeObjectURL(source.url);
    setSource(null);
  };

  return (
    <div className="grid gap-3">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-surface-2">
        {imageSrc ? (
          <Image src={imageSrc} alt="Cover image" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">
            No cover image yet. A wide photo (16:9) of the venue, artist or a past event works best.
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex h-10 cursor-pointer items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
        >
          {isUploading ? "Uploading…" : imageSrc ? "Replace image" : "Upload image"}
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || isUploading}
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {imageSrc ? (
          <Button variant="ghost" onClick={onRemove} disabled={disabled || isUploading}>
            Remove
          </Button>
        ) : null}
        <p className="text-xs text-muted">JPG, PNG or WebP up to 5 MB. You can adjust the framing.</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      {source ? (
        <CropDialog
          source={source}
          onCancel={closeCropper}
          onDone={(file) => {
            closeCropper();
            onCropped(file);
          }}
        />
      ) : null}
    </div>
  );
}

function CropDialog({
  source,
  onCancel,
  onDone,
}: {
  source: { url: string; name: string };
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; start: Offset } | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [frame, setFrame] = useState<Size>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setFrame({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const ready = natural && frame.width > 0;
  const scale = ready ? coverScale(natural, frame) * zoom : 1;
  const clamped = ready ? clampOffset(offset, natural, frame, zoom) : offset;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, start: clamped };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.start.x + event.clientX - drag.current.x,
      y: drag.current.start.y + event.clientY - drag.current.y,
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const crop = async () => {
    const image = imageRef.current;
    if (!ready || !image) return;
    setIsSaving(true);
    try {
      const rect = sourceRect(natural, frame, zoom, clamped);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT.width;
      canvas.height = OUTPUT.height;
      canvas.getContext("2d")?.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, OUTPUT.width, OUTPUT.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
      if (blob) onDone(new File([blob], source.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onCancel}
      title="Frame your cover image"
      description="Drag to move the photo and use the slider to zoom. This is how it appears on your event page."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void crop()} isLoading={isSaving} disabled={!ready}>
            Use this image
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative aspect-video w-full cursor-grab touch-none overflow-hidden rounded-md bg-black active:cursor-grabbing"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, drawn to a canvas */}
          <img
            ref={imageRef}
            src={source.url}
            alt="Image being cropped"
            draggable={false}
            onLoad={(event) =>
              setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
            }
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={
              ready
                ? {
                    width: natural.width * scale,
                    height: natural.height * scale,
                    transform: `translate(calc(-50% + ${clamped.x}px), calc(-50% + ${clamped.y}px))`,
                  }
                : { opacity: 0 }
            }
          />
        </div>
        <label className="grid gap-1.5 text-sm font-semibold">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="accent-[var(--accent)]"
          />
        </label>
      </div>
    </Dialog>
  );
}
