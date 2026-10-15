// QR codes are generated in the browser so ticket codes are never sent to a
// third-party service. The payload matches what check-in accepts.
export function ticketQrPayload(code: string): string {
  return `ETICKET-${code}`;
}

// The QR library loads on first use, so it stays out of the initial page bundle.
export async function ticketQrDataUrl(code: string, size = 320): Promise<string> {
  const { default: QRCode } = await import("qrcode");
  return QRCode.toDataURL(ticketQrPayload(code), {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
