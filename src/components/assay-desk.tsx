"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeAssay } from "@/lib/accounting";
import { EntryForm, SaveButton, toastSaved } from "@/components/entry/form";
import { useFormMemory } from "@/components/entry/memory";
import { NumberField } from "@/components/entry/number-field";
import type { PendingPiece } from "@/lib/dto";
import { formatAyar, formatWeight, gramBalance, parseAmount } from "@/lib/format";
import { formatJalaliFa } from "@/lib/date";
import { assayAction } from "@/server/actions";
import { Label, Select, Textarea } from "@/components/ui/input";

export function AssayDesk({
  pieces,
  labs,
  today,
}: {
  pieces: PendingPiece[];
  labs: { id: string; name: string }[];
  today: string;
}) {
  const router = useRouter();
  const [itemId, setItemId] = useState(pieces[0]?.id ?? "");
  const piece = pieces.find((item) => item.id === itemId);
  const [ayar, setAyar] = useState("735");
  const [kasr, setKasr] = useState("0");
  const [labId, setLabId] = useState(piece?.labId ?? "");
  const [envelopeNo, setEnvelopeNo] = useState(piece?.envelopeNo ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [pulse, setPulse] = useState(0);
  useFormMemory("assay", { ayar, labId }, (saved) => {
    if (saved.ayar) setAyar(saved.ayar);
    if (!piece?.labId && saved.labId && labs.some((lab) => lab.id === saved.labId)) setLabId(saved.labId);
  });
  useEffect(() => {
    if (pieces.some((item) => item.id === itemId)) return;
    const next = pieces[0];
    if (!next) return;
    setItemId(next.id);
    setLabId(next.labId);
    setEnvelopeNo(next.envelopeNo);
  }, [pieces, itemId]);

  const preview = useMemo(() => {
    if (!piece) return null;
    try {
      return computeAssay({
        originalScale: piece.scale,
        original750: piece.original750,
        actualAyar: parseAmount(ayar),
        kasrScale: kasr.trim() ? parseAmount(kasr) : 0,
        originAffectsGram: piece.originAffectsGram,
        originKey: piece.originKey,
        outs: piece.outs.map((out) => ({ key: out.key, scale: out.scale, booked750: out.booked750 })),
      });
    } catch (cause) {
      return cause instanceof Error ? cause.message : "پیش‌نمایش ممکن نیست";
    }
  }, [piece, ayar, kasr]);

  if (!piece) {
    return <div className="panel p-8 text-center text-[#6d6458]">شرطیِ بازی برای جواب ری نمانده است.</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <div className="panel max-h-[70vh] space-y-2 overflow-auto p-3">
        {pieces.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setItemId(item.id);
              setLabId(item.labId);
              setEnvelopeNo(item.envelopeNo);
            }}
            className={`block min-h-11 w-full rounded-xl px-3 py-2 text-right text-sm ${item.id === piece.id ? "bg-[#16211e] text-white" : "hover:bg-[#faf6ee]"}`}
          >
            <div>{item.codeLabel} · {item.kindLabel}</div>
            <div className="text-xs opacity-80">{formatWeight(item.scale)} گرم از {item.sourceName}</div>
          </button>
        ))}
      </div>
      <EntryForm
        className="panel space-y-4 p-5"
        pending={pending}
        dirty={Boolean(note.trim() || ayar.trim() !== "735" || kasr.trim() !== "0")}
        focusNonce={pulse}
        onClear={() => {
          setAyar("735");
          setKasr("0");
          setNote("");
          setEnvelopeNo(piece.envelopeNo);
          setPulse((n) => n + 1);
        }}
        onSubmit={() => {
          setError(null);
          start(async () => {
            const result = await assayAction({ date: today, itemId: piece.id, ayar, kasr, labId, envelopeNo, note });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            toastSaved(result.number, {
              onOpen: () => router.push(`/documents/${result.id}`),
              onPrint: () => router.push(`/documents/${result.id}/print?print=${Date.now()}`),
            });
            setNote("");
            setPulse((n) => n + 1);
            router.refresh();
          });
        }}
      >
        <div>
          <h2 className="text-xl">{piece.codeLabel}</h2>
          <p className="text-sm text-[#6d6458]">
            دریافت {formatJalaliFa(new Date(piece.received))} از {piece.sourceName}. تا امروز با عیار موقت ۷۵۰، معادل {formatWeight(piece.original750)} گرم نشسته است.
            {piece.originAffectsGram ? " این دریافت حساب گرمی داشته و اصلاح به همان حساب برمی‌گردد." : " این قطعه خرید پولی بوده و گرم فروشنده عوض نمی‌شود."}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>عیار جواب</Label>
            <NumberField data-autofocus="" data-entry-next="" kind="decimal" value={ayar} onChange={setAyar} />
          </div>
          <div>
            <Label>کسر ذوب (گرم ترازو)</Label>
            <NumberField kind="decimal" value={kasr} onChange={setKasr} />
          </div>
          <div>
            <Label>ری‌گیری</Label>
            <Select value={labId} onChange={(event) => setLabId(event.target.value)}>
              <option value="">—</option>
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>{lab.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>شماره پاکت</Label>
            <input className="field" value={envelopeNo} onChange={(event) => setEnvelopeNo(event.target.value)} />
          </div>
        </div>
        {typeof preview === "string" ? <p className="text-sm text-[#9d243c]">{preview}</p> : preview ? (
          <table className="ledger">
            <thead>
              <tr>
                <th>محل</th>
                <th>۷۵۰ قبلی</th>
                <th>۷۵۰ جدید</th>
                <th>اثر</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((line) => {
                const name = line.role === "STOCK" ? "موجودی صندوق" : line.role === "ORIGIN" ? piece.sourceName : piece.outs.find((out) => out.key === line.key)?.accountName ?? "حساب";
                const effect = line.role === "STOCK" ? line.stock750Delta : line.partyGramDelta;
                const view = gramBalance(effect.toString());
                const effectText = line.role === "STOCK"
                  ? (effect.isZero() ? "بدون تغییر موجودی" : effect.gt(0) ? `افزایش موجودی ${formatWeight(effect)}` : `کاهش موجودی ${formatWeight(effect.abs())}`)
                  : (view.side === "zero" ? "بدون تغییر" : `${view.label} ${view.abs}`);
                return (
                  <tr key={`${line.role}-${line.key}`}>
                    <td>{name}</td>
                    <td><span className="num">{formatWeight(line.old750)}</span></td>
                    <td><span className="num">{formatWeight(line.new750)}</span></td>
                    <td>{effectText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="یادداشت جواب" />
        {error ? <p className="text-sm text-[#9d243c]">{error}</p> : null}
        <SaveButton disabled={pending}>{pending ? "در حال ثبت…" : "ثبت جواب ری"}</SaveButton>
        <p className="text-xs text-[#6d6458]">عیار در این پیش‌نمایش با {ayar ? formatAyar(parseSafe(ayar)) : "—"} نشان داده می‌شود. برای اصلاح جواب، مدیر باید همین سند را ابطال کند.</p>
      </EntryForm>
    </div>
  );
}

function parseSafe(value: string) {
  try {
    return parseAmount(value);
  } catch {
    return 0;
  }
}
