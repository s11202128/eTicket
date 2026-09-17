export function formatMoney(priceCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-SB", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 2,
    }).format(priceCents / 100);
  } catch {
    return `${currency} ${(priceCents / 100).toFixed(2)}`;
  }
}
