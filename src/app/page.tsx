import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-10 h-10 rounded-xl mb-4" style={{ background: "linear-gradient(135deg, #0C6463, #149694)" }} />
      <h1 className="text-3xl font-extrabold mb-2" style={{ color: "#0C6463" }}>
        سَلِس حلول
      </h1>
      <p className="text-sm mb-8" style={{ color: "#5C716E" }}>
        نظام اشتراك وجبات صحية — مطابقة تلقائية لهدفك، توصيل يومي
      </p>
      <div className="flex gap-3">
        <Link
          href="/order-app"
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
          style={{ background: "#149694" }}
        >
          ابدأ اشتراكك
        </Link>
        <Link
          href="/admin"
          className="rounded-xl px-5 py-2.5 text-sm font-bold border"
          style={{ borderColor: "#E1ECEB", color: "#12211F" }}
        >
          لوحة تحكم المطعم
        </Link>
      </div>
    </main>
  );
}
