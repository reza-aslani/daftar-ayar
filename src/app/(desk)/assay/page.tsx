import { AssayDesk } from "@/components/assay-desk";
import { formatJalali, tehranTodayUtc } from "@/lib/date";
import { getPendingPieces, getDeskData } from "@/server/queries";

export default async function AssayPage() {
  const [pieces, desk] = await Promise.all([getPendingPieces(), getDeskData()]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">جواب ری</h1>
        <p className="mt-1 max-w-3xl text-sm text-[#6d6458]">
          شرطی تا اعلام آزمایشگاه با عیار ۷۵۰ در حساب می‌نشیند. با جواب، تفاوت عیار و کسر ذوب بین صندوق و حساب‌هایی که طلا را گرفته یا داده‌اند سرشکن می‌شود.
        </p>
      </div>
      <AssayDesk pieces={pieces} labs={desk.labs} today={formatJalali(tehranTodayUtc())} />
    </div>
  );
}
