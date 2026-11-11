"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settingsAction } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function SettingsForm({
  admin,
  shopName,
  defaultAyar,
  staleAbshodeDays,
}: {
  admin: boolean;
  shopName: string;
  defaultAyar: string;
  staleAbshodeDays: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="panel grid max-w-xl gap-3 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        start(async () => {
          const result = await settingsAction({
            shopName: String(form.get("shopName") ?? ""),
            defaultAyar: String(form.get("defaultAyar") ?? ""),
            staleAbshodeDays: String(form.get("staleAbshodeDays") ?? ""),
          });
          if (!result.ok) setError(result.error);
          else router.refresh();
        });
      }}
    >
      <div>
        <Label>نام فروشگاه</Label>
        <Input name="shopName" defaultValue={shopName} disabled={!admin} />
      </div>
      <div>
        <Label>عیار پیش‌فرض متفرقه</Label>
        <Input name="defaultAyar" defaultValue={defaultAyar} disabled={!admin} />
      </div>
      <div>
        <Label>روزهای راکد شدن آبشده</Label>
        <Input name="staleAbshodeDays" defaultValue={staleAbshodeDays} disabled={!admin} />
      </div>
      {error ? <p className="text-sm text-[#9d243c]">{error}</p> : null}
      {admin ? <Button disabled={pending}>{pending ? "در حال ذخیره…" : "ذخیره"}</Button> : <p className="text-sm text-[#6d6458]">فقط مدیر این مقدارها را عوض می‌کند.</p>}
    </form>
  );
}
