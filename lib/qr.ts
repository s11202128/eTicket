import QRCode from "qrcode";

// QR codes are generated in the browser so ticket codes are never sent to a
// third-party service. The payload matches what check-in accepts.
export function ticketQrPayload(code: string): string {
  return `ETICKET-${code}`;
}

export function ticketQrDataUrl(code: string, size = 320): Promise<string> {
  return QRCode.toDataURL(ticketQrPayload(code), {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
