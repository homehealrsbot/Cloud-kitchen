"use client";

// المسوّدة: طبقة التجميع قبل الإرسال.
//
// قبل: كل ضغطة زر كانت تكتب في القاعدة فوراً — ما فيه تراجع ولا مراجعة.
// الآن التعديل يُجمَّع هنا في ذاكرة الصفحة، والصفحة تعرض القيمة المسوّدة
// مكان القيمة الحيّة مع وسم «معلّق»، ولا شي يُكتب إلا بضغطة «إرسال».
//
// التعديل الثاني على نفس الصف يستبدل الأول (localKeyOf)، فالمسوّدة تبقى
// «آخر ما تريده» لا سجل تردّدك.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { localKeyOf, type StagedChange } from "@/lib/ops/changes";
import { submitChanges, type SubmitOutcome } from "@/app/admin/requests/actions";

interface DraftApi {
  items: StagedChange[];
  /** يضيف تعديلاً للمسوّدة أو يستبدل تعديلاً سابقاً على نفس الصف */
  stage: (c: Omit<StagedChange, "localId"> & { localId?: string }) => void;
  unstage: (localId: string) => void;
  clear: () => void;
  submit: () => void;
  pending: boolean;
  outcome: SubmitOutcome | null;
  dismiss: () => void;
  /** التعديل المعلّق على صف بعينه، أو null */
  draftFor: (kind: string, key: Record<string, unknown>) => StagedChange | null;
}

const Ctx = createContext<DraftApi | null>(null);

const EMPTY: DraftApi = {
  items: [],
  stage: () => {},
  unstage: () => {},
  clear: () => {},
  submit: () => {},
  pending: false,
  outcome: null,
  dismiss: () => {},
  draftFor: () => null,
};

/** يُستعمل في أي شاشة إدارة. خارج المزوّد يرجّع واجهة خاملة بدل ما ينهار. */
export function useDraft(): DraftApi {
  return useContext(Ctx) ?? EMPTY;
}

export function DraftProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StagedChange[]>([]);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const stage = useCallback((c: Omit<StagedChange, "localId"> & { localId?: string }) => {
    const localId = c.localId ?? localKeyOf(c.kind, c.targetKey);
    setOutcome(null);
    setItems((prev) => {
      const rest = prev.filter((x) => x.localId !== localId);
      // تعديل يرجّع الصف لقيمته الأصلية = إلغاء للمسوّدة، لا تعديل جديد
      if (Object.keys(c.patch).length === 0) return rest;
      return [...rest, { ...c, localId }];
    });
  }, []);

  const unstage = useCallback((localId: string) => {
    setItems((prev) => prev.filter((x) => x.localId !== localId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setOutcome(null);
  }, []);

  const submit = useCallback(() => {
    if (items.length === 0) return;
    start(async () => {
      const r = await submitChanges(items);
      setOutcome(r);
      // اللي انطبّق أو انتظر اعتماداً خرج من المسوّدة؛ اللي فشل يبقى فيها
      if (r.submitted > 0) setItems([]);
      router.refresh();
    });
  }, [items, router]);

  const draftFor = useCallback(
    (kind: string, key: Record<string, unknown>) => {
      const id = localKeyOf(kind, key);
      return items.find((x) => x.localId === id) ?? null;
    },
    [items],
  );

  // تحذير عند مغادرة الصفحة بمسوّدة ما أُرسلت — أرخص من فقد عمل ساعة
  useEffect(() => {
    if (items.length === 0) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [items.length]);

  const api = useMemo<DraftApi>(
    () => ({ items, stage, unstage, clear, submit, pending, outcome, dismiss: () => setOutcome(null), draftFor }),
    [items, stage, unstage, clear, submit, pending, outcome, draftFor],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
