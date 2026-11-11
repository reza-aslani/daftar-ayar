"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { createUserAction, updateUserAction } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Row = { id: string; username: string; name: string; role: Role; active: boolean };

export function UsersDesk({ users }: { users: Row[] }) {
  return (
    <div className="space-y-4">
      <CreateUser />
      <div className="space-y-3">
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}

function CreateUser() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("OPERATOR");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="panel grid gap-3 p-4 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        start(async () => {
          const result = await createUserAction({
            username: String(form.get("username") ?? ""),
            name: String(form.get("name") ?? ""),
            password: String(form.get("password") ?? ""),
            role,
          });
          if (!result.ok) setError(result.error);
          else {
            (event.target as HTMLFormElement).reset();
            router.refresh();
          }
        });
      }}
    >
      <div>
        <Label>نام کاربری</Label>
        <Input name="username" placeholder="karmand" />
      </div>
      <div>
        <Label>نام</Label>
        <Input name="name" />
      </div>
      <div>
        <Label>رمز</Label>
        <Input name="password" type="password" />
      </div>
      <div>
        <Label>نقش</Label>
        <Select value={role} onChange={(event) => setRole(event.target.value as Role)}>
          <option value="OPERATOR">کاربر عملیات</option>
          <option value="ADMIN">مدیر</option>
        </Select>
      </div>
      {error ? <p className="text-sm text-[#9d243c] md:col-span-4">{error}</p> : null}
      <Button disabled={pending} className="md:w-fit">{pending ? "…" : "افزودن کاربر"}</Button>
    </form>
  );
}

function UserRow({ user }: { user: Row }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(user.role);
  const [active, setActive] = useState(user.active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="panel grid gap-3 p-4 md:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        start(async () => {
          const result = await updateUserAction(user.id, {
            name: String(form.get("name") ?? ""),
            role,
            active,
            password: String(form.get("password") ?? ""),
          });
          if (!result.ok) setError(result.error);
          else router.refresh();
        });
      }}
    >
      <div className="text-sm text-[#6d6458] md:col-span-5">{user.username}</div>
      <Input name="name" defaultValue={user.name} />
      <Select value={role} onChange={(event) => setRole(event.target.value as Role)}>
        <option value="OPERATOR">کاربر عملیات</option>
        <option value="ADMIN">مدیر</option>
      </Select>
      <Input name="password" type="password" placeholder="رمز تازه، اگر لازم است" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> فعال
      </label>
      <Button disabled={pending} variant="outline">{pending ? "…" : "ذخیره"}</Button>
      {error ? <p className="text-sm text-[#9d243c] md:col-span-5">{error}</p> : null}
    </form>
  );
}
