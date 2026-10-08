"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, UtensilsCrossed, TrendingDown } from "lucide-react";
import { SECTIONS, SkuStatus } from "@/lib/ops/engine";
import { can } from "@/lib/ops/roles";
import { useSession } from "@/lib/ops/session";
import { useOps } from "@/lib/ops/store";
import { Card, CardTitle, Loading, OpsShell, Pill, StatusBadge, T, TableWrap, Td, Th, num, pct, sar } from "@/components/ops/ui";

type StatusFilter = "all" | SkuStatus;

export default function OpsMenuPage() {
  const ops = useOps();
  const session = useSession();
  const showFinance = can(session?.role, "finance.view");
  const [q, setQ] = useState("");
  const [section, setSection] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  if (!ops.ready) {
    return (
      <OpsShell title="المنيو">
        <Loading />
      </OpsShell>
    );
  }

  const list = ops.skus.filter((v) => {
    if (section !== "all" && v.sku.item.section !== section) return false;
    if (status !== "all" && v.quality.status !== status) return false;
    if (q.trim() && !`${v.sku.item.id} ${v.sku.item.name} ${v.sku.item.nameEn}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });
  const weakest = [...ops.computed].sort((a, b) => a.contributionPct - b.contributionPct).slice(0, 5);

  return (
    <OpsShell title="المنيو" subtitle={`${ops.skus.length} صنف — الحالة تجي من بوابات الجودة، وما يُباع إلا «جاهز للبيع»`}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 flex-1 min-w-[200px]" style={{ borderColor: T.border, background: T.surface }}>
          <Search size={14} style={{ color: T.inkSoft }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الرقم" className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <Pill active={status === "all"} onClick={() => setStatus("all")}>كل الحالات</Pill>
        <Pill active={status === "READY"} onClick={() => setStatus("READY")}>جاهز</Pill>
        <Pill active={status === "PENDING"} onClick={() => setStatus("PENDING")}>بانتظار</Pill>
        <Pill active={status === "HOLD"} onClick={() => setStatus("HOLD")}>متوقف</Pill>
      </div>
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        <Pill active={section === "all"} onClick={() => setSection("all")}>كل الأقسام</Pill>
        {SECTIONS.map((s) => (
          <Pill key={s} active={section === s} onClick={() => setSection(s)}>{s}</Pill>
        ))}
      </div>

      <Card className="mb-6">
        <CardTitle icon={<UtensilsCrossed size={17} />}>الأصناف ({list.length})</CardTitle>
        <TableWrap>
          <thead>
            <tr>
              <Th>رقم</Th>
              <Th>الصنف</Th>
              <Th>الحالة</Th>
              <Th>سعرات</Th>
              <Th>بروتين</Th>
              <Th>كارب</Th>
              <Th>دهون</Th>
              <Th>الحساسية</Th>
              <Th>صلاحية (س)</Th>
              {showFinance && <Th>السعر</Th>}
              {showFinance && <Th>تكلفة كاملة</Th>}
              {showFinance && <Th>هامش</Th>}
              {showFinance && <Th>سعر Performance</Th>}
              <Th>العائق الأول</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => {
              const c = v.sku;
              return (
                <tr key={c.item.id} className="border-t" style={{ borderColor: T.border }}>
                  <Td>{c.item.id}</Td>
                  <Td>
                    <Link href={`/admin/ops/kitchen-card?sku=${c.item.id}`} className="font-bold" style={{ color: T.ink }}>
                      {c.item.name}
                    </Link>
                    <div className="text-[10px] flex items-center gap-1.5 flex-wrap" style={{ color: T.inkSoft }}>
                      <span>{c.item.section}</span>
                      {c.lowCarb && <span className="rounded-full px-1.5" style={{ background: T.goodTint, color: T.good }}>قليل الكارب</span>}
                      {c.highProtein && <span className="rounded-full px-1.5" style={{ background: T.brandTint, color: T.brand }}>بروتين عالٍ</span>}
                    </div>
                  </Td>
                  <Td><StatusBadge status={v.quality.status} small /></Td>
                  <Td>{num(c.kcal, 0)}</Td>
                  <Td>{num(c.protein, 0)}</Td>
                  <Td>{num(c.carb, 0)}</Td>
                  <Td>{num(c.fat, 0)}</Td>
                  <Td><span style={{ color: c.allergens === "لا يوجد" ? T.inkSoft : T.warn }}>{c.allergens}</span></Td>
                  <Td>{c.item.shelfLifeH}</Td>
                  {showFinance && <Td strong>{sar(c.price, 0)}</Td>}
                  {showFinance && <Td>{sar(c.fullCost)}</Td>}
                  {showFinance && (
                    <Td strong><span style={{ color: c.marginAlert ? T.warn : T.good }}>{pct(c.contributionPct)}</span></Td>
                  )}
                  {showFinance && <Td>{c.isMain ? sar(c.pricePerf, 0) : "—"}</Td>}
                  <Td><span style={{ color: T.inkSoft }}>{v.quality.blocker || "—"}</span></Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
        {list.length === 0 && <div className="text-xs py-8 text-center" style={{ color: T.inkSoft }}>ما فيه أصناف تطابق الفلتر</div>}
        <div className="text-[10px] mt-3 leading-relaxed" style={{ color: T.inkSoft }}>
          القيم الغذائية{showFinance ? " والتكاليف" : ""} حسابية/تقديرية لحد ما تُغلق بوابات الجودة. لا ادعاءات صحية ولا ملصقات نهائية قبل «جاهز للبيع».
        </div>
      </Card>

      {showFinance && (
        <Card>
          <CardTitle icon={<TrendingDown size={17} />}>أضعف 5 أصناف هامشاً (لإعادة التسعير أو الوصفة)</CardTitle>
          <TableWrap>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>رقم</Th>
                <Th>الصنف</Th>
                <Th>السعر</Th>
                <Th>تكلفة كاملة</Th>
                <Th>هامش</Th>
              </tr>
            </thead>
            <tbody>
              {weakest.map((c, i) => (
                <tr key={c.item.id} className="border-t" style={{ borderColor: T.border }}>
                  <Td>{i + 1}</Td>
                  <Td>{c.item.id}</Td>
                  <Td strong>{c.item.name}</Td>
                  <Td>{sar(c.price, 0)}</Td>
                  <Td>{sar(c.fullCost)}</Td>
                  <Td strong><span style={{ color: c.marginAlert ? T.warn : T.brand }}>{pct(c.contributionPct)}</span></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}
    </OpsShell>
  );
}
