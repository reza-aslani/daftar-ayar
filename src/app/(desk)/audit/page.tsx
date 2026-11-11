import { redirect } from "next/navigation";
import { formatJalaliFa } from "@/lib/date";
import { getSession } from "@/server/auth";
import { getAudit } from "@/server/queries";

export default async function AuditPage() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") redirect("/");
  const rows = await getAudit();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">حسابرسی</h1>
      <p className="text-sm text-[#6d6458]">ورود، سند، ابطال، مظنه و تغییر حساب اینجا می‌ماند.</p>
      <div className="panel overflow-x-auto">
        <table className="ledger">
          <thead><tr><th>زمان</th><th>کاربر</th><th>کار</th><th>شرح</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatJalaliFa(row.createdAt)} <span className="num text-xs">{row.createdAt.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</span></td>
                <td>{row.user?.name ?? "—"}</td>
                <td>{label(row.action)}</td>
                <td>{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function label(action: string) {
  const map: Record<string, string> = {
    LOGIN: "ورود",
    POST_DOCUMENT: "ثبت سند",
    VOID_DOCUMENT: "ابطال سند",
    ASSAY: "جواب ری",
    SET_MAZANE: "مظنه",
    CREATE_ACCOUNT: "حساب تازه",
    UPDATE_ACCOUNT: "اصلاح حساب",
    UPDATE_SETTINGS: "تنظیمات",
    CREATE_USER: "کاربر تازه",
    UPDATE_USER: "اصلاح کاربر",
  };
  return map[action] ?? action;
}
