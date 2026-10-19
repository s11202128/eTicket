// QR codes are generated in the browser so ticket codes are never sent to a
// third-party service. The payload matches what check-in accepts.
export function ticketQrPayload(code: string): string {
  return `ETICKET-${code}`;
}

// Pulls the 12-character ticket code out of whatever the camera read: the
// ETICKET- payload, a bare code, or a link that contains one. Scanners can add
// spaces, line breaks or lower case. Anything else is returned trimmed, so
// the server still answers "not found" for it.
const TICKET_CODE = /(?:ETICKET-)?([A-F0-9]{12})(?![A-F0-9])/i;

export function parseTicketCode(scanned: string): string {
  const compact = scanned.replace(/\s+/g, "");
  const match = TICKET_CODE.exec(compact);
  return match ? match[1].toUpperCase() : compact;
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
