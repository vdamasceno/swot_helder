import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Save, Lock, CheckCircle2, CalendarRange } from "lucide-react";
import type { SwotCategory } from "@/lib/swot-items";

export const Route = createFileRoute("/_authenticated/validation")({
  component: ValidationForm,
});

type Period = {
  id: string;
  name: string;
  year: number;
  is_open: boolean;
  phase: "rodada1" | "consolidacao" | "rodada2" | "encerrado";
};

type ConsolidatedItem = {
  id: string;
  item_code: string;
  category: SwotCategory;
  indicator: string;
  content: string;
};

type Vote = "C" | "D" | "N";
type Priority = "curto" | "medio" | "longo";
type ImpactLevel = "alto" | "medio" | "baixo";

type ResponseRow = {
  item_id: string;
  vote: Vote;
  priority: Priority | null;
  impact_level: ImpactLevel | null;
  _dirty?: boolean;
  _id?: string;
};

const CAT_LABEL: Record<SwotCategory, string> = {
  strength: "Forças (PF)",
  weakness: "Fraquezas (FR)",
  opportunity: "Oportunidades (OP)",
  threat: "Ameaças (AM)",
};

const CAT_COLOR: Record<SwotCategory, string> = {
  strength: "text-emerald-600",
  weakness: "text-amber-600",
  opportunity: "text-blue-600",
  threat: "text-red-600",
};

const VOTE_LABEL: Record<Vote, string> = { C: "Concordo", D: "Discordo", N: "Neutro" };
const VOTE_VARIANT: Record<Vote, "default" | "destructive" | "secondary"> = {
  C: "default",
  D: "destructive",
  N: "secondary",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  curto: "Curto prazo (≤ 12 meses)",
  medio: "Médio prazo (1–4 anos)",
  longo: "Longo prazo (> 4 anos)",
};

const IMPACT_LABEL: Record<ImpactLevel, string> = {
  alto: "Alto impacto",
  medio: "Médio impacto",
  baixo: "Baixo impacto",
};

const CAT_ORDER: SwotCategory[] = ["strength", "weakness", "opportunity", "threat"];

function ValidationForm() {
  const { user, profile } = useAuth();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [items, setItems] = useState<ConsolidatedItem[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("evaluation_periods")
        .select("id,name,year,is_open,phase")
        .order("opened_at", { ascending: false });
      const list = (data ?? []) as Period[];
      setPeriods(list);
      const auto = list.find((p) => p.is_open && p.phase === "rodada2") ?? list.find((p) => p.is_open) ?? list[0] ?? null;
      setPeriod(auto);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!period || !user) return;
    (async () => {
      const [{ data: cons }, { data: resp }] = await Promise.all([
        supabase
          .from("consolidated_items")
          .select("id,item_code,category,indicator,content")
          .eq("period_id", period.id)
          .order("item_code"),
        supabase
          .from("validation_responses")
          .select("id,item_id,vote,priority,impact_level")
          .eq("period_id", period.id)
          .eq("user_id", user.id),
      ]);
      setItems((cons ?? []) as ConsolidatedItem[]);
      const map: Record<string, ResponseRow> = {};
      (resp ?? []).forEach((r: any) => {
        map[r.item_id] = {
          item_id: r.item_id,
          vote: r.vote,
          priority: r.priority,
          impact_level: r.impact_level,
          _id: r.id,
        };
      });
      setResponses(map);
    })();
  }, [period, user]);

  const canEdit = period?.is_open && period?.phase === "rodada2" && profile?.status === "approved";

  const grouped = useMemo(() => {
    const out: Record<SwotCategory, ConsolidatedItem[]> = { strength: [], weakness: [], opportunity: [], threat: [] };
    items.forEach((i) => out[i.category].push(i));
    return out;
  }, [items]);

  const isAO = (cat: SwotCategory) => cat === "opportunity" || cat === "threat";

  const setVote = (item: ConsolidatedItem, vote: Vote) => {
    setResponses((prev) => {
      const cur = prev[item.id] ?? { item_id: item.id, vote, priority: null, impact_level: null };
      return {
        ...prev,
        [item.id]: {
          ...cur,
          vote,
          priority: vote === "C" && !isAO(item.category) ? cur.priority ?? "medio" : null,
          impact_level: vote === "C" && isAO(item.category) ? cur.impact_level ?? "medio" : null,
          _dirty: true,
        },
      };
    });
  };

  const setPriority = (itemId: string, priority: Priority) => {
    setResponses((prev) => {
      const cur = prev[itemId];
      if (!cur) return prev;
      return { ...prev, [itemId]: { ...cur, priority, _dirty: true } };
    });
  };

  const setImpact = (itemId: string, impact_level: ImpactLevel) => {
    setResponses((prev) => {
      const cur = prev[itemId];
      if (!cur) return prev;
      return { ...prev, [itemId]: { ...cur, impact_level, _dirty: true } };
    });
  };

  const saveAll = async () => {
    if (!user || !period) return;
    const dirty = Object.values(responses).filter((r) => r._dirty);
    if (!dirty.length) return toast.info("Nada para salvar.");
    const errs: string[] = [];
    for (const r of dirty) {
      const payload = { vote: r.vote, priority: r.priority, impact_level: r.impact_level };
      if (r._id) {
        const { error } = await supabase.from("validation_responses").update(payload).eq("id", r._id);
        if (error) errs.push(error.message);
      } else {
        const { data, error } = await supabase
          .from("validation_responses")
          .insert({ user_id: user.id, period_id: period.id, item_id: r.item_id, ...payload })
          .select("id")
          .single();
        if (error) errs.push(error.message);
        else if (data) {
          setResponses((prev) => ({ ...prev, [r.item_id]: { ...prev[r.item_id], _id: data.id, _dirty: false } }));
        }
      }
    }
    if (errs.length) return toast.error(errs.join("; "));
    setResponses((prev) => {
      const out: typeof prev = {};
      for (const k of Object.keys(prev)) out[k] = { ...prev[k], _dirty: false };
      return out;
    });
    toast.success("Validações salvas.");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!period) {
    return (
      <Card className="p-8 text-center">
        <Lock className="size-8 mx-auto text-muted-foreground" />
        <h2 className="mt-3 font-semibold">Nenhum ciclo encontrado</h2>
      </Card>
    );
  }

  const totalDone = Object.keys(responses).length;
  const totalItems = items.length;
  const progressPct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="space-y-2 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Rodada 2 · Validação</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarRange className="size-4 text-muted-foreground shrink-0" />
            <Select value={period.id} onValueChange={(id) => setPeriod(periods.find((p) => p.id === id) ?? null)}>
              <SelectTrigger className="w-[220px] sm:w-[280px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} · {p.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canEdit ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="size-3" /> Edição liberada
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Lock className="size-3" /> Somente leitura
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Para cada item: marque <strong>Concordo / Discordo / Neutro</strong>. Ao concordar com Forças/Fraquezas,
            indique a <strong>prioridade temporal</strong>. Para Ameaças/Oportunidades, indique o{" "}
            <strong>nível de impacto</strong>.
          </p>
        </div>
        {canEdit && (
          <Button onClick={saveAll} className="shrink-0">
            <Save className="size-4 mr-2" /> Salvar
          </Button>
        )}
      </div>

      {/* Progress */}
      {totalItems > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso: {totalDone}/{totalItems} itens</span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      {totalItems === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">
          A lista consolidada ainda não foi publicada para este ciclo.
        </Card>
      )}

      {/* Items by category */}
      {CAT_ORDER.map((cat) => grouped[cat].length > 0 && (
        <Card key={cat} className="p-4 sm:p-5">
          <h2 className={`font-semibold mb-4 ${CAT_COLOR[cat]}`}>{CAT_LABEL[cat]}</h2>
          <div className="divide-y">
            {grouped[cat].map((it) => {
              const r = responses[it.id];
              const ao = isAO(it.category);
              return (
                <div key={it.id} className="py-4 space-y-3">
                  {/* Code + content */}
                  <div className="flex gap-2">
                    <span className="font-mono text-xs font-semibold text-muted-foreground pt-0.5 shrink-0 w-14">
                      {it.item_code}
                    </span>
                    <p className="text-sm flex-1">{it.content}</p>
                  </div>
                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-2 pl-16">
                    {/* Vote buttons */}
                    <div className="flex gap-1.5">
                      {(["C", "D", "N"] as Vote[]).map((v) => (
                        <Button
                          key={v}
                          size="sm"
                          variant={r?.vote === v ? VOTE_VARIANT[v] : "outline"}
                          disabled={!canEdit}
                          onClick={() => setVote(it, v)}
                          title={VOTE_LABEL[v]}
                          className="w-8 px-0"
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                    {/* Priority (PF/FR) or Impact (AM/OP) */}
                    {!ao && r?.vote === "C" && (
                      <Select
                        value={r.priority ?? "medio"}
                        disabled={!canEdit}
                        onValueChange={(v) => setPriority(it.id, v as Priority)}
                      >
                        <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                            <SelectItem key={p} value={p} className="text-xs">{PRIORITY_LABEL[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {ao && r?.vote === "C" && (
                      <Select
                        value={r.impact_level ?? "medio"}
                        disabled={!canEdit}
                        onValueChange={(v) => setImpact(it.id, v as ImpactLevel)}
                      >
                        <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(IMPACT_LABEL) as ImpactLevel[]).map((l) => (
                            <SelectItem key={l} value={l} className="text-xs">{IMPACT_LABEL[l]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
