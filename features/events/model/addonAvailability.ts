// Add-on availability for the booking panel. Pure, unit-tested.
// The database re-checks stock when booking (book_ticket).

export type PublicAddon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  // null = unlimited
  quantity: number | null;
  sold: number;
};

// book_ticket accepts up to 20 of each add-on per booking.
export const MAX_ADDON_PER_ORDER = 20;

/** Most of this add-on one booking can take (0 when sold out). */
export function maxAddonQuantity(addon: PublicAddon): number {
  if (addon.quantity === null) return MAX_ADDON_PER_ORDER;
  return Math.max(Math.min(addon.quantity - addon.sold, MAX_ADDON_PER_ORDER), 0);
}

/** The chosen add-ons as book_ticket expects them (zero quantities dropped). */
export function addonLines(chosen: Record<string, number>): { id: string; quantity: number }[] {
  return Object.entries(chosen)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({ id, quantity }));
}
