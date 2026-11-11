import { SettingsForm } from "@/components/settings-form";
import { getSession } from "@/server/auth";
import { getSettings } from "@/server/queries";

export default async function SettingsPage() {
  const [settings, user] = await Promise.all([getSettings(), getSession()]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">تنظیمات</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#6d6458]">
          عیار مبنای دفتر ۷۵۰ است و عوض نمی‌شود. عیار پیش‌فرض متفرقه، مثل زرین، ۷۴۰ است و مدیر می‌تواند آن را عوض کند. آبشده اگر عیار نگیرد ۷۵۰ پیشنهاد می‌شود. ضریب مثقال {settings.mesghalGrams.toString()} × {settings.mesghalAyar.toString()} / {settings.standardAyar.toString()} ثابت این نسخه است.
        </p>
      </div>
      <SettingsForm
        admin={user?.role === "ADMIN"}
        shopName={settings.shopName}
        defaultAyar={settings.defaultAyar.toString()}
        staleAbshodeDays={String(settings.staleAbshodeDays)}
      />
    </div>
  );
}
