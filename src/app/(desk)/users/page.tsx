import { redirect } from "next/navigation";
import { UsersDesk } from "@/components/users-desk";
import { getSession } from "@/server/auth";
import { getUsers } from "@/server/queries";

export default async function UsersPage() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") redirect("/");
  const users = await getUsers();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">کاربران</h1>
      <p className="text-sm text-[#6d6458]">مدیر ابطال، تنظیمات و کاربران را دارد. کاربر عملیات سند می‌زند و مظنه را ثبت می‌کند.</p>
      <UsersDesk users={users.map((item) => ({ id: item.id, username: item.username, name: item.name, role: item.role, active: item.active }))} />
    </div>
  );
}
