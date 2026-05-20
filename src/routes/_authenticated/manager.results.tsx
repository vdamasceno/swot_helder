import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import type { SwotCategory } from "@/lib/swot-items";

export const Route = createFileRoute("/_authenticated/manager/results")({
  validateSearch: (search: Record<string, unknown>): { period?: string } => ({
    period: typeof search.period === "string" ? search.period : undefined,
  }),
  component: ResultsPage,
});

type Period = {
  id: string;
  name: string;
  year: number;
  is_open: boolean;
  phase: string;
  concord_threshold: number;
};

type ConsolidatedItem = {
  id: string;
  item_code: string;
  category: SwotCategory;
  indicator: string;
  content: string;
};

type ValidationResponse = {
  item_id: string;
  vote: "C" | "D" | "N";
  priority: string | null;
  impact_level: string | null;
  user_id: string;
};

type ItemStats = {
  item: ConsolidatedItem;
  total: number;
  c: number;
  d: number;
  n: number;
  concordPct: number;
  approved: boolean;
  modalPriority: string | null;
  modalImpact: string | null;
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

const CAT_ORDER: SwotCategory[] = ["strength", "weakness", "opportunity", "threat"];

const PRIORITY_LABEL: Record<string, string> = {
  curto: "Curto prazo",
  medio: "Médio prazo",
  longo: "Longo prazo",
};

const IMPACT_LABEL: Record<string, string> = {
  alto: "Alto impacto",
  medio: "Médio impacto",
  baixo: "Baixo impacto",
};

function modal(vals: (string | null)[]): string | null {
  const freq: Record<string, number> = {};
  for (const v of vals) {
    if (v) freq[v] = (freq[v] ?? 0) + 1;
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of Object.entries(freq)) {
    if (n > bestN) { bestN = n; best = k; }
  }
  return best;
}

function ResultsPage() {
  const { role } = useAuth();
  const { period: periodIdParam } = Route.useSearch();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [items, setItems] = useState<ConsolidatedItem[]>([]);
  const [responses, setResponses] = useState<ValidationResponse[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("evaluation_periods")
        .select("id,name,year,is_open,phase,concord_threshold")
        .order("opened_at", { ascending: false });
      const list = (data ?? []) as Period[];
      setPeriods(list);
      const auto =
        (periodIdParam ? list.find((p) => p.id === periodIdParam) : null) ??
        list.find((p) => p.phase === "rodada2" || p.phase === "encerrado") ??
        list[0] ??
        null;
      setPeriod(auto);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!period) return;
    (async () => {
      const [{ data: cons }, { data: resp }] = await Promise.all([
        supabase
          .from("consolidated_items")
          .select("id,item_code,category,indicator,content")
          .eq("period_id", period.id)
          .order("item_code"),
        supabase
          .from("validation_responses")
          .select("item_id,vote,priority,impact_level,user_id")
          .eq("period_id", period.id),
      ]);
      setItems((cons ?? []) as ConsolidatedItem[]);
      const allResp = (resp ?? []) as ValidationResponse[];
      setResponses(allResp);
      const uniqueUsers = new Set(allResp.map((r) => r.user_id)).size;
      setTotalParticipants(uniqueUsers);
    })();
  }, [period]);

  if (role !== "gestor") return <p className="text-sm text-muted-foreground">Acesso restrito ao gestor.</p>;
  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const threshold = period?.concord_threshold ?? 70;

  const stats = useMemo<ItemStats[]>(() => {
    return items.map((item) => {
      const votes = responses.filter((r) => r.item_id === item.id);
      const total = votes.length;
      const c = votes.filter((v) => v.vote === "C").length;
      const d = votes.filter((v) => v.vote === "D").length;
      const n = votes.filter((v) => v.vote === "N").length;
      const concordPct = total > 0 ? Math.round((c / total) * 100) : 0;
      const approved = concordPct >= threshold;
      const isAO = item.category === "opportunity" || item.category === "threat";
      const modalPriority = !isAO ? modal(votes.filter((v) => v.vote === "C").map((v) => v.priority)) : null;
      const modalImpact = isAO ? modal(votes.filter((v) => v.vote === "C").map((v) => v.impact_level)) : null;
      return { item, total, c, d, n, concordPct, approved, modalPriority, modalImpact };
    });
  }, [items, responses, threshold]);

  const grouped = useMemo(() => {
    const out: Record<SwotCategory, ItemStats[]> = { strength: [], weakness: [], opportunity: [], threat: [] };
    stats.forEach((s) => out[s.item.category].push(s));
    return out;
  }, [stats]);

  const approvedCount = stats.filter((s) => s.approved).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/manager" className="text-xs text-muted-foreground hover:underline">← Painel do gestor</Link>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">Resultados — Rodada 2</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Concordância por item após a validação. Critério de aprovação: ≥ {threshold}% de "Concordo".
          </p>
        </div>
        <Select value={period?.id ?? ""} onValueChange={(id) => setPeriod(periods.find((p) => p.id === id) ?? null)}>
          <SelectTrigger className="w-[220px] sm:w-[260px] h-9 shrink-0"><SelectValue placeholder="Selecione o ciclo" /></SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name} · {p.year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      {period && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Participantes</div>
            <div className="text-2xl font-bold mt-1">{totalParticipants}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Itens avaliados</div>
            <div className="text-2xl font-bold mt-1">{items.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Aprovados (≥{threshold}%)</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{approvedCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Reprovados</div>
            <div className="text-2xl font-bold mt-1 text-destructive">{items.length - approvedCount}</div>
          </Card>
        </div>
      )}

      {items.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">
          Nenhum item consolidado encontrado para este ciclo. Complete a fase de consolidação primeiro.
        </Card>
      )}

      {items.length > 0 && totalParticipants === 0 && (
        <Card className="p-5 border-l-4 border-l-amber-500 bg-amber-500/5 text-sm">
          <p className="font-medium">Aguardando votos da Rodada 2</p>
          <p className="text-muted-foreground mt-1">
            Há {items.length} itens consolidados disponíveis para validação, mas nenhum participante respondeu ainda.
            Certifique-se de que o ciclo está na fase <strong>Rodada 2 — Validação</strong> e que os participantes acessaram o link de validação.
          </p>
        </Card>
      )}

      {/* Results by category */}
      {CAT_ORDER.map((cat) => grouped[cat].length > 0 && (
        <Card key={cat} className="p-4 sm:p-5">
          <h2 className={`font-semibold mb-4 ${CAT_COLOR[cat]}`}>
            {CAT_LABEL[cat]} — {grouped[cat].filter((s) => s.approved).length}/{grouped[cat].length} aprovados
          </h2>
          <div className="divide-y">
            {grouped[cat].map(({ item, total, c, d, n, concordPct, approved, modalPriority, modalImpact }) => (
              <div key={item.id} className="py-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {approved
                      ? <CheckCircle2 className="size-4 text-emerald-600" />
                      : <XCircle className="size-4 text-destructive" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">{item.item_code}</span>
                      <Badge variant={approved ? "default" : "destructive"} className="text-[10px] h-5">
                        {concordPct}% concordância
                      </Badge>
                      {modalPriority && approved && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {PRIORITY_LABEL[modalPriority] ?? modalPriority}
                        </Badge>
                      )}
                      {modalImpact && approved && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {IMPACT_LABEL[modalImpact] ?? modalImpact}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1">{item.content}</p>
                    {total > 0 && (
                      <div className="mt-2 space-y-1">
                        <Progress value={concordPct} className="h-1.5" />
                        <div className="flex gap-4 text-[11px] text-muted-foreground">
                          <span className="text-emerald-600">C: {c}</span>
                          <span className="text-destructive">D: {d}</span>
                          <span>N: {n}</span>
                          <span className="ml-auto">{total} respostas</span>
                        </div>
                      </div>
                    )}
                    {total === 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MinusCircle className="size-3" /> Sem respostas
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {approvedCount > 0 && (
        <div className="flex justify-end">
          <Link to="/manager/action-plan">
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              Criar Plano de Ação →
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
