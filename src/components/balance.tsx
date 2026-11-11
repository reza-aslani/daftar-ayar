import { formatRial, formatWeight, gramBalance, rialBalance, tomanOf } from "@/lib/format";

export function Num({ children }: { children: React.ReactNode }) {
  return <span className="num">{children}</span>;
}

export function GramText({ value, withUnit = true }: { value: string; withUnit?: boolean }) {
  const view = gramBalance(value);
  const color = view.side === "debit" ? "debit" : view.side === "credit" ? "credit" : "text-[#6d6458]";
  return (
    <span className={color}>
      {view.label}
      {view.side !== "zero" ? (
        <>
          {" "}
          <Num>{view.abs}</Num>
          {withUnit ? " گرم" : ""}
        </>
      ) : null}
    </span>
  );
}

export function RialText({ value, toman = false, asset = false }: { value: string; toman?: boolean; asset?: boolean }) {
  const view = rialBalance(value);
  const label = asset ? (view.side === "debit" ? "موجودی" : view.side === "credit" ? "کسری" : "صفر") : view.label;
  const color = view.side === "debit" ? "debit" : view.side === "credit" ? "credit" : "text-[#6d6458]";
  return (
    <span className={color}>
      {label}
      {view.side !== "zero" ? (
        <>
          {" "}
          <Num>{view.abs}</Num> ریال
          {toman ? (
            <span className="mt-0.5 block text-xs text-[#6d6458]">
              <Num>{formatRial(tomanOf(BigInt(value)))}</Num> تومان
            </span>
          ) : null}
        </>
      ) : null}
    </span>
  );
}

export function Weight({ value }: { value: string }) {
  return <Num>{formatWeight(value)}</Num>;
}

export function Money({ value }: { value: string | bigint }) {
  const v = typeof value === "bigint" ? value : BigInt(value);
  return <Num>{formatRial(v)}</Num>;
}
