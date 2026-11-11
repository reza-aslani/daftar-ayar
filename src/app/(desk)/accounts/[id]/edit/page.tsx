import { notFound } from "next/navigation";
import { AccountForm } from "@/components/account-form";
import { prisma } from "@/lib/db";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">اصلاح {account.name}</h1>
      <AccountForm
        id={account.id}
        initial={{
          name: account.name,
          family: account.family,
          group: account.group,
          phone: account.phone,
          mobile: account.mobile,
          address: account.address,
          nationalId: account.nationalId,
          note: account.note,
          active: account.active,
          system: account.system,
        }}
      />
    </div>
  );
}
