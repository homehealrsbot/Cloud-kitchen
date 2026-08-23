import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Image src="/logo-mark.png" alt="Food Style" width={72} height={72} className="rounded-2xl mb-4" />
      <h1 className="text-3xl font-extrabold mb-2" style={{ color: "#A84F2E" }}>
        Food Style
      </h1>
      <p className="text-sm mb-8" style={{ color: "#7A6153" }}>
        نظام اشتراك وجبات صحية — مطابقة تلقائية لهدفك، توصيل يومي
      </p>
      <div className="flex gap-3">
        <Link
          href="/order-app"
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
          style={{ background: "#D67A4F" }}
        >
          ابدأ اشتراكك
        </Link>
        <Link
          href="/admin"
          className="rounded-xl px-5 py-2.5 text-sm font-bold border"
          style={{ borderColor: "#F0DFD3", color: "#2B1B14" }}
        >
          لوحة تحكم المطعم
        </Link>
      </div>
    </main>
  );
}
