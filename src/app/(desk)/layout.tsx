import { Shell } from "@/components/shell";
import { formatJalaliLong, tehranTodayUtc } from "@/lib/date";
import { getSettings } from "@/server/queries";
import { requireUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  return (
    <Shell shopName={settings.shopName} today={formatJalaliLong(tehranTodayUtc())} user={{ name: user.name, role: user.role }}>
      {children}
    </Shell>
  );
}
