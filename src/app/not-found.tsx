import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl">این صفحه در دفتر نیست</h1>
      <p className="mt-2 text-[#6d6458]">آدرس را بررسی کنید یا به پیشخوان برگردید.</p>
      <Link href="/" className="mt-4 inline-block text-[#8d6a2e]">پیشخوان</Link>
    </main>
  );
}
