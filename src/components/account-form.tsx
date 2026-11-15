"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AccountGroup } from "@prisma/client";
import { EntryForm, SaveButton } from "@/components/entry/form";
import { useFormMemory } from "@/components/entry/memory";
import { GROUP_LABEL } from "@/lib/labels";
import { normalizeDigits } from "@/lib/number-input";
import { invalidateSearchPeople } from "@/lib/search-cache";
import { createAccountAction, updateAccountAction } from "@/server/actions";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

const groups: AccountGroup[] = ["CUSTOMER", "MAKER", "BANK", "EXPENSE", "INVESTOR"];

function keepDigits(event: React.FormEvent<HTMLInputElement>) {
  const el = event.currentTarget;
  const next = normalizeDigits(el.value);
  if (next === el.value) return;
  const pos = el.selectionStart ?? next.length;
  el.value = next;
  const place = Math.min(pos, next.length);
  el.setSelectionRange(place, place);
}

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
    branch: string;
    accountNo: string;
    iban: string;
    active: boolean;
    system: boolean;
  };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [group, setGroup] = useState<AccountGroup>(initial?.group ?? "CUSTOMER");
  const [active, setActive] = useState(initial?.active ?? true);
  const [pulse, setPulse] = useState(0);
  const [clean, setClean] = useState(0);
  useFormMemory(id ? "account-edit" : "account-new", { group }, (saved) => {
    if (id) return;
    if (groups.includes(saved.group as AccountGroup)) setGroup(saved.group as AccountGroup);
  });

  return (
    <EntryForm
      ref={formRef}
      className="panel grid gap-3 p-5 md:grid-cols-2"
      pending={pending}
      focusNonce={pulse}
      cleanNonce={clean}
      onClear={() => {
        formRef.current?.reset();
        setGroup(initial?.group ?? "CUSTOMER");
        setActive(initial?.active ?? true);
        setPulse((n) => n + 1);
      }}
      onSubmit={(event) => {
        const form = new FormData(event.currentTarget);
        const input = {
          name: String(form.get("name") ?? ""),
          family: String(form.get("family") ?? ""),
          phone: normalizeDigits(String(form.get("phone") ?? "")),
          mobile: normalizeDigits(String(form.get("mobile") ?? "")),
          address: String(form.get("address") ?? ""),
          nationalId: normalizeDigits(String(form.get("nationalId") ?? "")),
          note: String(form.get("note") ?? ""),
          branch: String(form.get("branch") ?? ""),
          accountNo: normalizeDigits(String(form.get("accountNo") ?? "")),
          iban: String(form.get("iban") ?? ""),
        };
        setError(null);
        start(async () => {
          const result = id ? await updateAccountAction(id, { ...input, active }) : await createAccountAction({ ...input, group });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          invalidateSearchPeople();
          if (id) {
            router.push(`/accounts/${result.id}`);
            router.refresh();
            return;
          }
          toast.success("حساب ثبت شد", {
            action: { label: "مشاهده", onClick: () => router.push(`/accounts/${result.id}`) },
          });
          formRef.current?.reset();
          setClean((n) => n + 1);
          setPulse((n) => n + 1);
          router.refresh();
        });
      }}
    >
      <div>
        <Label>نام</Label>
        <Input name="name" data-autofocus="" defaultValue={initial?.name} required />
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
        <Input name="mobile" inputMode="tel" dir="ltr" className="text-left" defaultValue={initial?.mobile} onInput={keepDigits} />
      </div>
      <div>
        <Label>تلفن</Label>
        <Input name="phone" inputMode="tel" dir="ltr" className="text-left" defaultValue={initial?.phone} onInput={keepDigits} />
      </div>
      <div>
        <Label>کد ملی</Label>
        <Input name="nationalId" inputMode="numeric" dir="ltr" className="text-left" defaultValue={initial?.nationalId} onInput={keepDigits} />
      </div>
      <div className="md:col-span-2">
        <Label>آدرس</Label>
        <Input name="address" defaultValue={initial?.address} />
      </div>
      {group === "BANK" ? (
        <>
          <div>
            <Label>شعبه</Label>
            <Input name="branch" defaultValue={initial?.branch} />
          </div>
          <div>
            <Label>شماره حساب</Label>
            <Input name="accountNo" inputMode="numeric" dir="ltr" className="text-left" defaultValue={initial?.accountNo} onInput={keepDigits} />
          </div>
          <div className="md:col-span-2">
            <Label>شبا</Label>
            <Input name="iban" dir="ltr" className="text-left" defaultValue={initial?.iban} />
          </div>
        </>
      ) : null}
      <div className="md:col-span-2">
        <Label>یادداشت</Label>
        <Textarea name="note" defaultValue={initial?.note} />
      </div>
      {id ? (
        <label className="flex min-h-11 items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" className="size-5" checked={active} disabled={initial?.system} onChange={(event) => setActive(event.target.checked)} />
          حساب فعال است
        </label>
      ) : null}
      {id ? <p className="text-xs text-[#6d6458] md:col-span-2">گروه حساب بعد از ساخت عوض نمی‌شود تا ماهیت هزینه و مشتری در تراز جابه‌جا نشود.</p> : null}
      {error ? <p className="text-sm text-[#9d243c] md:col-span-2">{error}</p> : null}
      <SaveButton disabled={pending} className="md:col-span-2 md:w-fit">{pending ? "در حال ذخیره…" : "ذخیره"}</SaveButton>
    </EntryForm>
  );
}
