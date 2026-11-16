"use client";

import { useState } from "react";
import { telegramHref, whatsAppHref, type InvoiceShare } from "@/lib/invoice";

async function receiptFile(text: string, name: string): Promise<File | null> {
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const font = getComputedStyle(document.body).fontFamily || "Tahoma, sans-serif";
    const lines = text.split("\n").slice(0, 48);
    const width = 760;
    const lineHeight = 34;
    const pad = 32;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = pad * 2 + 8 + lines.length * lineHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0e3f86";
    ctx.fillRect(0, 0, canvas.width, 8);
    ctx.fillStyle = "#1b2838";
    ctx.font = `22px ${font}`;
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    lines.forEach((line, index) => {
      ctx.fillText(line, width - pad, pad + index * lineHeight, width - pad * 2);
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((item) => resolve(item), "image/png"));
    if (!blob) return null;
    return new File([blob], name, { type: "image/png" });
  } catch {
    return null;
  }
}

export function InvoiceShare({ share, id }: { share: InvoiceShare; id: string }) {
  const [hint, setHint] = useState<string | null>(null);
  const wa = whatsAppHref(share.brief, share.url, share.phone);
  const tg = telegramHref(share.brief, share.url);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(share.text);
      setHint("متن فاکتور کپی شد.");
    } catch {
      setHint("کپی ممکن نشد. متن را از صفحه انتخاب کنید.");
    }
  }

  async function shareNative() {
    setHint(null);
    if (!navigator.share) {
      await copyText();
      return;
    }
    const file = await receiptFile(share.text, `factor-${id}.png`);
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: share.title, text: share.text, url: share.url, files: [file] });
        return;
      }
      await navigator.share({ title: share.title, text: share.text, url: share.url });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyText();
    }
  }

  const button = "inline-flex min-h-12 items-center justify-center border border-[#8eadd4] bg-white px-4 text-sm md:min-h-10";
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
        <button type="button" className="inline-flex min-h-12 w-full items-center justify-center bg-[#0e3f86] px-4 text-sm text-white md:min-h-10 md:w-auto" onClick={() => void shareNative()}>
          ارسال برای مشتری
        </button>
        <button type="button" className={`${button} w-full md:w-auto`} onClick={() => void copyText()}>
          کپی متن
        </button>
        <a className={`${button} w-full md:w-auto`} href={wa} target="_blank" rel="noopener noreferrer">
          واتساپ
        </a>
        <a className={`${button} w-full md:w-auto`} href={tg} target="_blank" rel="noopener noreferrer">
          تلگرام
        </a>
      </div>
      {hint ? <p role="status" className="text-sm text-[#0e3f86]">{hint}</p> : null}
    </div>
  );
}
