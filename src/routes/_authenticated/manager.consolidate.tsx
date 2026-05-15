import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Save, RefreshCw, Plus, Lock } from "lucide-react";
import { GENERAL_ITEM_CODE, type SwotCategory } from "@/lib/swot-items";

export const Route = createFileRoute("/_authenticated/manager/consolidate")({
  component: ConsolidatePage,
});

type Period = {
  id: string;
  name: string;
  year: number;
  is_open: boolean;
  phase: "rodada1" | "consolidacao" | "rodada2" | "encerrado";
};

type RawEntry = {
  id: string;
  user_id: string;
  item_code: string;
  category: SwotCategory;
  content: string;
};

type ConsolidatedItem = {
  id?: string;
  item_code: string;
  category: SwotCategory;
  indicator: string;
  content: string;
  position: number;
  _new?: boolean;
  _dirty?: boolean;
};

const CAT_PREFIX: Record<SwotCategory, string> = {
  strength: "PF",
  weakness: "FR",
  opportunity: "OP",
  threat: "AM",
};

const CAT_LABEL: Record<SwotCategory, string> = {
  strength: "Forças",
  weakness: "Fraquezas",
  opportunity: "Oportunidades",
  threat: "Ameaças",
};

const CAT_COLOR: Record<SwotCategory, string> = {
  strength: "text-emerald-600",
  weakness: "text-amber-600",
  opportunity: "text-blue-600",
  threat: "text-red-600",
};

const CAT_ORDER: SwotCategory[] = ["strength", "weakness", "opportunity", "threat"];

function ConsolidatePage() {
  const { role } = useAuth();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [items, setItems] = useState<ConsolidatedItem[]>([]);
  const [rawCount, setRawCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("evaluation_periods")
        .select("id,name,year,is_open,phase")
        .order("opened_at", { ascending: false });
      const list = (data ?? []) as Period[];
      setPeriods(list);
      const auto = list.find((p) => p.phase === "consolidacao") ?? list.find((p) => p.is_open) ?? list[0] ?? null;
      setPeriod(auto);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!period) return;
    (async () => {
      const [{ data: cons }, { count }] = await Promise.all([
        supabase
          .from("consolidated_items")
          .select("id,item_code,category,indicator,content,position")
          .eq("period_id", period.id)
          .order("item_code"),
        supabase
          .from("swot_entries")
          .select("*", { count: "exact", head: true })
          .eq("period_id", period.id),
      ]);
      setItems((cons ?? []) as ConsolidatedItem[]);
      setRawCount(count ?? 0);
    })();
  }, [period]);

  if (role !== "gestor") return <p className="text-sm text-muted-foreground">Acesso restrito ao gestor.</p>;
  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!period) return <p className="text-sm text-muted-foreground">Nenhum ciclo encontrado.</p>;

  const importRaw = async () => {
    if (!confirm("Isto vai SUBSTITUIR a lista consolidada atual com base nas respostas brutas da Rodada 1. Continuar?")) return;
    const { data: raw } = await supabase
      .from("swot_entries")
      .select("id,user_id,item_code,category,content")
      .eq("period_id", period.id)
      .order("category");
    const entries = (raw ?? []) as RawEntry[];

    const { error: delErr } = await supabase.from("consolidated_items").delete().eq("period_id", period.id);
    if (delErr) return toast.error(delErr.message);

    const counters: Record<SwotCategory, number> = { strength: 0, weakness: 0, opportunity: 0, threat: 0 };
    const inserts = entries
      .filter((e) => e.content.trim())
      .sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category) || a.item_code.localeCompare(b.item_code))
      .map((e, i) => {
        counters[e.category] += 1;
        const num = String(counters[e.category]).padStart(3, "0");
        const indicator = e.category === "opportunity" || e.category === "threat" ? GENERAL_ITEM_CODE : e.item_code;
        return {
          period_id: period.id,
          item_code: `${CAT_PREFIX[e.category]}${num}`,
          category: e.category,
          indicator,
          content: e.content.trim(),
          position: i,
        };
      });

    if (!inserts.length) return toast.warning("Nenhuma resposta bruta encontrada.");

    const { data: out, error } = await supabase
      .from("consolidated_items")
      .insert(inserts)
      .select("id,item_code,category,indicator,content,position");
    if (error) return toast.error(error.message);
    setItems((out ?? []) as ConsolidatedItem[]);
    toast.success(`${inserts.length} itens importados. Edite, mescle ou exclua antes de avançar.`);
  };

  const updateLocal = (idx: number, patch: Partial<ConsolidatedItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch, _dirty: true } : it)));
  };

  const removeItem = async (idx: number) => {
    const it = items[idx];
    if (it.id) {
      const { error } = await supabase.from("consolidated_items").delete().eq("id", it.id);
      if (error) return toast.error(error.message);
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addManual = (cat: SwotCategory) => {
    const used = items.filter((i) => i.category === cat).length + 1;
    const code = `${CAT_PREFIX[cat]}${String(used).padStart(3, "0")}`;
    setItems((prev) => [
      ...prev,
      {
        item_code: code,
        category: cat,
        indicator: cat === "opportunity" || cat === "threat" ? GENERAL_ITEM_CODE : "Q1",
        content: "",
        position: prev.length,
        _new: true,
        _dirty: true,
      },
    ]);
  };

  const saveDirty = async () => {
    const dirty = items.filter((i) => i._dirty && i.content.trim());
    if (!dirty.length) return toast.info("Nada para salvar.");
    const inserts = dirty.filter((i) => i._new).map((i) => ({
      period_id: period.id,
      item_code: i.item_code,
      category: i.category,
      indicator: i.indicator,
      content: i.content.trim(),
      position: i.position,
    }));
    const updates = dirty.filter((i) => !i._new && i.id);

    const errs: string[] = [];
    if (inserts.length) {
      const { error } = await supabase.from("consolidated_items").insert(inserts);
      if (error) errs.push(error.message);
    }
    for (const u of updates) {
      const { error } = await supabase
        .from("consolidated_items")
        .update({ content: u.content.trim(), indicator: u.indicator, item_code: u.item_code })
        .eq("id", u.id!);
      if (error) errs.push(error.message);
    }
    if (errs.length) return toast.error(errs.join("; "));
    const { data } = await supabase
      .from("consolidated_items")
      .select("id,item_code,category,indicator,content,position")
      .eq("period_id", period.id)
      .order("item_code");
    setItems((data ?? []) as ConsolidatedItem[]);
    toast.success("Alterações salvas.");
  };

  const grouped = useMemo(() => {
    const out: Record<SwotCategory, ConsolidatedItem[]> = { strength: [], weakness: [], opportunity: [], threat: [] };
    items.forEach((i) => out[i.category].push(i));
    return out;
  }, [items]);

  const locked = period.phase !== "consolidacao";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <Link to="/manager" className="text-xs text-muted-foreground hover:underline">← Painel do gestor</Link>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">Consolidação · {period.name} ({period.year})</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">
            Gere a lista numerada (PF/FR/AM/OP) a partir das respostas brutas. Edite, mescle duplicatas e elimine itens antes de publicar a Rodada 2.
          </p>
        </div>
        <Select value={period.id} onValueChange={(id) => setPeriod(periods.find((p) => p.id === id) ?? null)}>
          <SelectTrigger className="w-[220px] sm:w-[260px] h-9 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name} · {p.year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {locked && (
        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5 text-sm">
          <Lock className="size-4 inline mr-2" />
          O ciclo não está em fase de Consolidação. Avance no painel do gestor para liberar a edição.
        </Card>
      )}

      {/* Import / Save actions */}
      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold">Importar respostas brutas</h2>
            <p className="text-xs text-muted-foreground">
              {rawCount} respostas na Rodada 1. A importação substitui a lista atual.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={importRaw} disabled={locked || !rawCount} variant="secondary" size="sm">
              <RefreshCw className="size-4 mr-1" /> Importar e numerar
            </Button>
            <Button onClick={saveDirty} disabled={locked} size="sm">
              <Save className="size-4 mr-1" /> Salvar alterações
            </Button>
          </div>
        </div>
      </Card>

      {/* Items by category */}
      {CAT_ORDER.map((cat) => (
        <Card key={cat} className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${CAT_COLOR[cat]}`}>
              {CAT_LABEL[cat]} ({grouped[cat].length})
            </h3>
            {!locked && (
              <Button size="sm" variant="ghost" onClick={() => addManual(cat)}>
                <Plus className="size-4 mr-1" /> Adicionar
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {grouped[cat].length === 0 && (
              <p className="text-xs italic text-muted-foreground">Nenhum item consolidado.</p>
            )}
            {grouped[cat].map((it) => {
              const idx = items.indexOf(it);
              return (
                <div key={it.id ?? `new-${idx}`} className="space-y-2 p-3 bg-muted/30 rounded-md">
                  {/* Codes row */}
                  <div className="flex gap-2 flex-wrap">
                    <input
                      disabled={locked}
                      className="h-8 px-2 rounded border bg-background text-sm font-mono w-24 disabled:opacity-60"
                      value={it.item_code}
                      onChange={(e) => updateLocal(idx, { item_code: e.target.value.toUpperCase() })}
                      placeholder="PF001"
                    />
                    <input
                      disabled={locked || cat === "opportunity" || cat === "threat"}
                      className="h-8 px-2 rounded border bg-background text-sm w-20 disabled:opacity-60"
                      value={it.indicator}
                      onChange={(e) => updateLocal(idx, { indicator: e.target.value })}
                      placeholder="Q1"
                    />
                    {!locked && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={() => removeItem(idx)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    disabled={locked}
                    value={it.content}
                    onChange={(e) => updateLocal(idx, { content: e.target.value })}
                    className="min-h-[60px] text-sm"
                    placeholder="Conteúdo do item..."
                  />
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
