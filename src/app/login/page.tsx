import { redirect } from "next/navigation";
import { loginAction } from "@/server/actions";
import { getSession } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await getSession();
  if (user) redirect("/");
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="z-window">
        <div className="z-cap">دفتر عیار</div>
        <div className="p-5">
        <h1 className="text-2xl">ورود</h1>
        <p className="mt-2 text-sm text-[#4d6278]">حسابداری آبشده، سکه، صندوق و تراز.</p>
        <form action={loginAction} className="mt-6 space-y-3">
          <div>
            <Label htmlFor="username">نام کاربری</Label>
            <Input id="username" name="username" autoComplete="username" required />
          </div>
          <div>
            <Label htmlFor="password">رمز</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {params.e ? <p className="text-sm text-[#9d243c]">نام کاربری یا رمز نادرست است.</p> : null}
          <Button className="w-full" type="submit">ورود</Button>
        </form>
        <div className="mt-5 bg-[#e7f0fb] p-3 text-sm leading-6">
          نسخهٔ نمونه: مدیر <span className="num">reza / ayar750</span>
          <br />
          کاربر عملیات <span className="num">sara / ayar740</span>
        </div>
        </div>
      </div>
    </main>
  );
}
