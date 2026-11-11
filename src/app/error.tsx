"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl">نمایش این صفحه ممکن نشد</h1>
      <p className="mt-2 text-sm text-[#9d243c]">{error.message}</p>
      <button className="mt-4 rounded-xl bg-[#16211e] px-4 py-2 text-white" onClick={reset}>تلاش دوباره</button>
    </main>
  );
}
