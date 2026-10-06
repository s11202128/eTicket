import { ticketQrDataUrl } from "@/lib/qr";

// Draws a printable ticket on a canvas and exports it as PNG or PDF,
// entirely in the browser (no third-party services, no PDF library).

export type TicketArtwork = {
  code: string;
  eventTitle: string;
  dateText: string;
  timeText: string;
  location: string;
  holderName: string;
  status: string;
};

const WIDTH = 1200;
const HEIGHT = 520;
const STUB_X = 820;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && context.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

async function drawTicket(ticket: TicketArtwork): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported in this browser.");

  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

  // Ticket body
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#ff5a4e";
  context.fillRect(0, 0, 16, HEIGHT);

  // Perforation between body and stub
  context.strokeStyle = "#334155";
  context.setLineDash([10, 12]);
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(STUB_X, 30);
  context.lineTo(STUB_X, HEIGHT - 30);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "#ffffff";
  for (const y of [0, HEIGHT]) {
    context.beginPath();
    context.arc(STUB_X, y, 26, 0, Math.PI * 2);
    context.fill();
  }

  // Event details
  const left = 70;
  const textWidth = STUB_X - left - 50;
  context.fillStyle = "#ff8a80";
  context.font = `700 22px ${font}`;
  context.fillText("E-TICKET", left, 80);

  context.fillStyle = "#f8fafc";
  context.font = `800 52px ${font}`;
  context.fillText(fitText(context, ticket.eventTitle, textWidth), left, 160);

  const rows: [string, string][] = [
    ["DATE", ticket.dateText],
    ["TIME", ticket.timeText],
    ["VENUE", ticket.location],
    ["NAME", ticket.holderName],
  ];
  rows.forEach(([label, value], index) => {
    const y = 240 + index * 66;
    context.fillStyle = "#a3b1c6";
    context.font = `700 18px ${font}`;
    context.fillText(label, left, y);
    context.fillStyle = "#f8fafc";
    context.font = `600 28px ${font}`;
    context.fillText(fitText(context, value, textWidth), left, y + 32);
  });

  // Stub with QR
  const qr = await loadImage(await ticketQrDataUrl(ticket.code, 600));
  const qrSize = 300;
  const qrX = STUB_X + (WIDTH - STUB_X - qrSize) / 2;
  context.fillStyle = "#ffffff";
  context.fillRect(qrX - 14, 70 - 14, qrSize + 28, qrSize + 28);
  context.drawImage(qr, qrX, 70, qrSize, qrSize);

  context.fillStyle = "#f8fafc";
  context.font = `700 30px ui-monospace, Consolas, monospace`;
  context.textAlign = "center";
  context.fillText(ticket.code, STUB_X + (WIDTH - STUB_X) / 2, 440);
  context.fillStyle = "#a3b1c6";
  context.font = `600 20px ${font}`;
  context.fillText(ticket.status.toUpperCase(), STUB_X + (WIDTH - STUB_X) / 2, 476);
  context.textAlign = "left";

  return canvas;
}

export async function ticketPngBlob(ticket: TicketArtwork): Promise<Blob> {
  const canvas = await drawTicket(ticket);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image."))), "image/png");
  });
}

// A one-page PDF containing the ticket as a JPEG image. Hand-built so no
// PDF library is needed: header, 5 objects, cross-reference table, trailer.
export async function ticketPdfBlob(ticket: TicketArtwork): Promise<Blob> {
  const canvas = await drawTicket(ticket);
  const jpegBase64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
  const jpeg = Uint8Array.from(atob(jpegBase64), (char) => char.charCodeAt(0));

  // A4 landscape in points, ticket centred.
  const pageWidth = 842;
  const pageHeight = 595;
  const drawWidth = 760;
  const drawHeight = (drawWidth * HEIGHT) / WIDTH;
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = () => offsets.push(length);

  const content = `q ${drawWidth} 0 0 ${drawHeight.toFixed(2)} ${x} ${y.toFixed(2)} cm /Im0 Do Q`;

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  startObject();
  push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");
  startObject();
  push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n");
  startObject();
  push(
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >> endobj\n`
  );
  startObject();
  push(
    `4 0 obj << /Type /XObject /Subtype /Image /Width ${WIDTH} /Height ${HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >> stream\n`
  );
  push(jpeg);
  push("\nendstream endobj\n");
  startObject();
  push(`5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`);

  const xrefOffset = length;
  push(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((offset) => push(`${String(offset).padStart(10, "0")} 00000 n \n`));
  push(`trailer << /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}
