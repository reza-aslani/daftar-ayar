"use client";

import { useState, useTransition } from "react";
import type { AccountGroup } from "@prisma/client";
import { GROUP_LABEL } from "@/lib/labels";
import { normalizeDigits } from "@/lib/number-input";
import type { AccountOption } from "@/lib/dto";
import { invalidateSearchPeople } from "@/lib/search-cache";
import { createAccountAction } from "@/server/actions";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { EntryForm, SaveButton } from "@/components/entry/form";
import { useFormMemory } from "@/components/entry/memory";

const groups: AccountGroup[] = ["CUSTOMER", "MAKER", "EXPENSE", "INVESTOR"];

export function NewPersonDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (person: AccountOption) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-entry-dialog=""
        className="w-[min(92vw,28rem)]"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DialogTitle>شخص جدید</DialogTitle>
        <p className="mt-1 mb-3 text-sm text-[#4d6278]">نام را بنویسید و با F5 ذخیره کنید. همین شخص در سند انتخاب می‌شود.</p>
        {open ? <QuickPersonForm onCreated={onCreated} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function QuickPersonForm({ onCreated }: { onCreated: (person: AccountOption) => void }) {
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  const [mobile, setMobile] = useState("");
  const [group, setGroup] = useState<AccountGroup>("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useFormMemory("person-quick", { group }, (saved) => {
    if (groups.includes(saved.group as AccountGroup)) setGroup(saved.group as AccountGroup);
  });

  return (
    <EntryForm
      className="grid gap-3"
      pending={pending}
      dirty={Boolean(name.trim() || family.trim() || mobile.trim())}
      onSubmit={() => {
        setError(null);
        start(async () => {
          const result = await createAccountAction({ name, family, group, mobile: normalizeDigits(mobile) });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          invalidateSearchPeople();
          onCreated({
            id: result.id,
            code: result.code ?? 0,
            title: result.title || `${name} ${family}`.trim(),
            group,
            groupLabel: GROUP_LABEL[group],
          });
        });
      }}
    >
      <div>
        <Label htmlFor="new-person-name">نام</Label>
        <Input id="new-person-name" data-autofocus="" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>
      <div>
        <Label>نام خانوادگی</Label>
        <Input value={family} onChange={(event) => setFamily(event.target.value)} />
      </div>
      <div>
        <Label>گروه</Label>
        <Select value={group} onChange={(event) => setGroup(event.target.value as AccountGroup)}>
          {groups.map((item) => (
            <option key={item} value={item}>{GROUP_LABEL[item]}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>موبایل</Label>
        <Input
          inputMode="tel"
          dir="ltr"
          className="text-left"
          value={mobile}
          onChange={(event) => setMobile(normalizeDigits(event.target.value))}
        />
      </div>
      {error ? <p className="bg-[#fde8e8] px-3 py-2 text-sm text-[#a32020]">{error}</p> : null}
      <SaveButton disabled={pending}>{pending ? "در حال ثبت…" : "ثبت شخص"}</SaveButton>
    </EntryForm>
  );
}
