"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AccountGroup } from "@prisma/client";
import { GROUP_LABEL } from "@/lib/labels";
import { createAccountAction, updateAccountAction } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const groups: AccountGroup[] = ["CUSTOMER", "MAKER", "BANK", "EXPENSE", "INVESTOR"];

export function AccountForm({
  id,
  initial,
}: {
  id?: string;
  initial?: {
    name: string;
    family: string;
    group: AccountGroup;
    phone: string;
    mobile: string;
    address: string;
    nationalId: string;
    note: string;
    active: boolean;
    system: boolean;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [group, setGroup] = useState<AccountGroup>(initial?.group ?? "CUSTOMER");
  const [active, setActive] = useState(initial?.active ?? true);

  return (
    <form
      className="panel grid gap-3 p-5 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const input = {
          name: String(form.get("name") ?? ""),
          family: String(form.get("family") ?? ""),
          phone: String(form.get("phone") ?? ""),
          mobile: String(form.get("mobile") ?? ""),
          address: String(form.get("address") ?? ""),
          nationalId: String(form.get("nationalId") ?? ""),
          note: String(form.get("note") ?? ""),
        };
        setError(null);
        start(async () => {
          const result = id
            ? await updateAccountAction(id, { ...input, active })
            : await createAccountAction({ ...input, group });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(`/accounts/${result.id}`);
          router.refresh();
        });
      }}
    >
      <div>
        <Label>نام</Label>
        <Input name="name" defaultValue={initial?.name} required />
      </div>
      <div>
        <Label>نام خانوادگی</Label>
        <Input name="family" defaultValue={initial?.family} />
      </div>
      <div>
        <Label>گروه</Label>
        {id ? (
          <Input disabled value={GROUP_LABEL[initial?.group ?? "CUSTOMER"]} />
        ) : (
          <Select value={group} onChange={(event) => setGroup(event.target.value as AccountGroup)}>
            {groups.map((item) => (
              <option key={item} value={item}>{GROUP_LABEL[item]}</option>
            ))}
          </Select>
        )}
      </div>
      <div>
        <Label>موبایل</Label>
        <Input name="mobile" defaultValue={initial?.mobile} />
      </div>
      <div>
        <Label>تلفن</Label>
        <Input name="phone" defaultValue={initial?.phone} />
      </div>
      <div>
        <Label>کد ملی</Label>
        <Input name="nationalId" defaultValue={initial?.nationalId} />
      </div>
      <div className="md:col-span-2">
        <Label>آدرس</Label>
        <Input name="address" defaultValue={initial?.address} />
      </div>
      <div className="md:col-span-2">
        <Label>یادداشت</Label>
        <Textarea name="note" defaultValue={initial?.note} />
      </div>
      {id ? (
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={active} disabled={initial?.system} onChange={(event) => setActive(event.target.checked)} />
          حساب فعال است
        </label>
      ) : null}
      {id ? <p className="text-xs text-[#6d6458] md:col-span-2">گروه حساب بعد از ساخت عوض نمی‌شود تا ماهیت هزینه و مشتری در تراز جابه‌جا نشود.</p> : null}
      {error ? <p className="text-sm text-[#9d243c] md:col-span-2">{error}</p> : null}
      <Button disabled={pending} className="md:col-span-2 md:w-fit">{pending ? "در حال ذخیره…" : "ذخیره"}</Button>
    </form>
  );
}
