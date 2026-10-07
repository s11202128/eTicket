// Cover image cropping (16:9 frame, zoom + drag). Pure, unit-tested.

export type Size = { width: number; height: number };
export type Offset = { x: number; y: number };

// Scale that makes the image just cover the frame at zoom 1.
export function coverScale(image: Size, frame: Size): number {
  return Math.max(frame.width / image.width, frame.height / image.height);
}

/** Keeps the image covering the whole frame (no empty edges). */
export function clampOffset(offset: Offset, image: Size, frame: Size, zoom: number): Offset {
  const scale = coverScale(image, frame) * zoom;
  const maxX = Math.max((image.width * scale - frame.width) / 2, 0);
  const maxY = Math.max((image.height * scale - frame.height) / 2, 0);
  return {
    x: Math.min(Math.max(offset.x, -maxX), maxX),
    y: Math.min(Math.max(offset.y, -maxY), maxY),
  };
}

/** The part of the original image (in image pixels) visible in the frame. */
export function sourceRect(image: Size, frame: Size, zoom: number, offset: Offset) {
  const scale = coverScale(image, frame) * zoom;
  const left = (frame.width - image.width * scale) / 2 + offset.x;
  const top = (frame.height - image.height * scale) / 2 + offset.y;
  return {
    x: -left / scale,
    y: -top / scale,
    width: frame.width / scale,
    height: frame.height / scale,
  };
}
