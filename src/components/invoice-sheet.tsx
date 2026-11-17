import { GramText, RialText } from "@/components/balance";
import { code128Widths } from "@/lib/barcode";
import type { InvoiceDocument } from "@/lib/invoice";

function Barcode({ value }: { value: string }) {
  const widths = code128Widths(value);
  const quiet = 10;
  const total = widths.reduce((sum, width) => sum + width, 0) + quiet * 2;
  let x = quiet;
  let dark = true;
  const bars = widths.map((width, index) => {
    const rect = dark ? <rect key={index} x={x} y={0} width={width} height={46} /> : null;
    x += width;
    dark = !dark;
    return rect;
  });
  return (
    <svg viewBox={`0 0 ${total} 46`} className="h-12 w-full" role="img" aria-label={`بارکد سند ${value}`}>
      {bars}
    </svg>
  );
}

function QrMark({ cells }: { cells: boolean[][] }) {
  const size = cells.length;
  const marks = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (cells[y]?.[x]) marks.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-16 w-16" role="img" aria-label="کد سند" shapeRendering="crispEdges">
      {marks}
    </svg>
  );
}

export function InvoiceSheet({ invoice, qr }: { invoice: InvoiceDocument; qr: boolean[][] }) {
  return (
    <article className="invoice-sheet">
      <header className="text-center">
        <div className="text-lg font-bold leading-7">{invoice.shopName}</div>
        <div className="text-sm">فاکتور {invoice.kindLabel}</div>
      </header>
      <div className="invoice-rule" />
      <div className="flex items-start justify-between gap-3 text-sm">
        <div>
          <div className="text-xs text-[#6d6458]">سند</div>
          <div className="num text-lg font-bold">{invoice.numberLabel}</div>
        </div>
        <div className="text-left">
          <div>{invoice.dateLabel}</div>
          <div className="text-[#6d6458]">ساعت ثبت {invoice.timeLabel}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-base font-semibold">{invoice.accountTitle}</div>
        <div className="text-sm text-[#4d6278]">
          {invoice.groupLabel} · کد {invoice.accountCodeLabel}
          {invoice.phone ? ` · ${invoice.phone}` : ""}
        </div>
      </div>
      {invoice.voidLabel ? <p className="mt-3 bg-[#fff1f2] px-2 py-2 text-sm text-[#9d243c]">{invoice.voidLabel}</p> : null}
      <table className="factor mt-3">
        <thead>
          <tr>
            <th>شرح</th>
            <th>وزن</th>
            <th>عیار</th>
            <th>مظنه / فی</th>
            <th className="col-wage">اجرت</th>
            <th>مبلغ</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id}>
              <td>{line.title}</td>
              <td data-label="وزن" className={line.weight || line.weight750 ? undefined : "is-blank"}>
                {line.weight ? <span className="num">{line.weight}</span> : null}
                {line.weight750 ? <div className="text-[11px] text-[#6d6458]">۷۵۰: <span className="num">{line.weight750}</span></div> : null}
              </td>
              <td data-label="عیار" className={line.ayar ? undefined : "is-blank"}>{line.ayar ? <span className="num">{line.ayar}</span> : null}</td>
              <td data-label="مظنه" className={line.price ? undefined : "is-blank"}>
                {line.price ? (
                  <>
                    <span className="num">{line.price}</span>
                    {line.priceExtra ? <div className="text-[11px] text-[#6d6458]">{line.priceExtra}</div> : null}
                  </>
                ) : null}
              </td>
              <td className="col-wage" data-label="اجرت">{line.wage ?? "—"}</td>
              <td data-label="مبلغ" className={line.amount || line.side ? undefined : "is-blank"}>
                {line.amount ? <span className="num">{line.amount}</span> : null}
                {line.side ? <div className="text-[11px]">{line.side}</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoice.wageMerged ? <p className="mt-2 text-[11px] leading-5 text-[#6d6458]">اجرت و سود جدا چاپ نمی‌شود و در مبلغ طلا یکی شده است.</p> : null}
      {invoice.tradeAmount || invoice.receivedAmount || invoice.paidAmount ? (
        <div className="mt-3 space-y-1 border-t border-[#e6d7bf] pt-2 text-sm">
          {invoice.tradeAmount ? <div className="flex justify-between gap-3"><span>جمع مبلغ</span><span className="num font-bold">{invoice.tradeAmount}</span></div> : null}
          {invoice.receivedAmount ? <div className="flex justify-between gap-3"><span>دریافت‌شده</span><span className="num">{invoice.receivedAmount}</span></div> : null}
          {invoice.paidAmount ? <div className="flex justify-between gap-3"><span>پرداخت‌شده</span><span className="num">{invoice.paidAmount}</span></div> : null}
        </div>
      ) : null}
      <div className="invoice-balances mt-3">
        <div>
          <div className="text-xs text-[#6d6458]">مانده قبل از سند</div>
          <div className="mt-1 text-sm"><RialText value={invoice.before.rial} toman asset={invoice.asset} /></div>
          <div className="text-sm"><GramText value={invoice.before.gram} /></div>
        </div>
        <div>
          <div className="text-xs text-[#6d6458]">مانده بعد از سند</div>
          <div className="mt-1 text-sm"><RialText value={invoice.after.rial} toman asset={invoice.asset} /></div>
          <div className="text-sm"><GramText value={invoice.after.gram} /></div>
        </div>
      </div>
      {invoice.footer ? <p className="mt-4 whitespace-pre-wrap text-center text-sm leading-6">{invoice.footer}</p> : null}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Barcode value={invoice.barcode} />
          <div className="mt-1 text-center text-[11px] text-[#6d6458]">بارکد شماره سند <span className="num">{invoice.numberLabel}</span></div>
        </div>
        <div className="shrink-0 text-center">
          <QrMark cells={qr} />
          <div className="mt-1 text-[11px] text-[#6d6458]">باز کردن سند</div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-[#6d6458]">ثبت {invoice.createdByName}</p>
    </article>
  );
}
