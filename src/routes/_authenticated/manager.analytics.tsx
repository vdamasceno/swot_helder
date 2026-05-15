import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { SwotCategory } from "@/lib/swot-items";

export const Route = createFileRoute("/_authenticated/manager/analytics")({
  component: AnalyticsPage,
});

const CAT_LABEL: Record<SwotCategory, string> = {
  strength: "Forças",
  weakness: "Fraquezas",
  opportunity: "Oportunidades",
  threat: "Ameaças",
};
const CAT_COLOR: Record<SwotCategory, string> = {
  strength: "#10b981",
  weakness: "#f59e0b",
  opportunity: "#3b82f6",
  threat: "#ef4444",
};
const CAT_ORDER: SwotCategory[] = ["strength", "weakness", "opportunity", "threat"];

type Period = { id: string; name: string; year: number; phase: string };
type PeriodStats = {
  period: Period;
  totalParticipants: number;
  totalItems: number;
  approvedItems: number;
  approvalRate: number;
  byCategory: Record<SwotCategory, { total: number; approved: number }>;
};

function AnalyticsPage() {
  const { role } = useAuth();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [stats, setStats] = useState<PeriodStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== "gestor") return;
    (async () => {
      const { data: pers } = await supabase
        .from("evaluation_periods")
        .select("id,name,year,phase")
        .in("phase", ["rodada2", "encerrado"])
        .order("opened_at");
      if (!pers?.length) { setLoading(false); return; }
      setPeriods(pers as Period[]);

      const results: PeriodStats[] = await Promise.all(
        (pers as Period[]).map(async (p) => {
          const [{ data: items }, { data: resps }] = await Promise.all([
            supabase
              .from("consolidated_items")
              .select("id,category")
              .eq("period_id", p.id),
            supabase
              .from("validation_responses")
              .select("item_id,vote,user_id")
              .eq("period_id", p.id),
          ]);

          const allItems = (items ?? []) as { id: string; category: SwotCategory }[];
          const allResps = (resps ?? []) as { item_id: string; vote: string; user_id: string }[];
          const uniqueUsers = new Set(allResps.map((r) => r.user_id)).size;

          // threshold default 70 (sem buscar por período para simplificar)
          const threshold = 70;

          const byCategory: Record<SwotCategory, { total: number; approved: number }> = {
            strength: { total: 0, approved: 0 },
            weakness: { total: 0, approved: 0 },
            opportunity: { total: 0, approved: 0 },
            threat: { total: 0, approved: 0 },
          };

          let approved = 0;
          for (const item of allItems) {
            const cat = item.category as SwotCategory;
            byCategory[cat].total++;
            const votes = allResps.filter((r) => r.item_id === item.id);
            const total = votes.length;
            const c = votes.filter((v) => v.vote === "C").length;
            const pct = total > 0 ? Math.round((c / total) * 100) : 0;
            if (pct >= threshold) {
              byCategory[cat].approved++;
              approved++;
            }
          }

          return {
            period: p,
            totalParticipants: uniqueUsers,
            totalItems: allItems.length,
            approvedItems: approved,
            approvalRate: allItems.length > 0 ? Math.round((approved / allItems.length) * 100) : 0,
            byCategory,
          };
        })
      );

      setStats(results);
      setLoading(false);
    })();
  }, [role]);

  if (role !== "gestor") return <p className="text-sm text-muted-foreground">Acesso restrito ao gestor.</p>;
  if (loading) return <p className="text-sm text-muted-foreground">Carregando análises...</p>;

  // Dados para gráfico de linha: taxa de aprovação por ciclo
  const lineData = stats.map((s) => ({
    ciclo: `${s.period.name} (${s.period.year})`,
    "Taxa de aprovação (%)": s.approvalRate,
    "Participantes": s.totalParticipants,
    "Itens validados": s.totalItems,
  }));

  // Dados para gráfico de barras agrupadas: aprovados por categoria
  const barData = stats.map((s) => ({
    ciclo: `${s.period.year}`,
    Forças: s.byCategory.strength.approved,
    Fraquezas: s.byCategory.weakness.approved,
    Oportunidades: s.byCategory.opportunity.approved,
    Ameaças: s.byCategory.threat.approved,
  }));

  const noData = stats.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/manager" className="text-xs text-muted-foreground hover:underline">← Painel do gestor</Link>
        <h1 className="text-xl sm:text-2xl font-bold mt-1">Análise Comparativa</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Evolução dos resultados entre ciclos de avaliação. Apenas ciclos na fase Rodada 2 ou Encerrado são exibidos.
        </p>
      </div>

      {noData && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum ciclo com dados de validação ainda. Complete pelo menos uma Rodada 2 para ver as análises comparativas.
        </Card>
      )}

      {!noData && (
        <>
          {/* Cards resumo por ciclo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.map((s) => (
              <Card key={s.period.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm">{s.period.name}</div>
                    <div className="text-xs text-muted-foreground">{s.period.year}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {s.period.phase === "encerrado" ? "Encerrado" : "Rodada 2"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">{s.totalParticipants}</div>
                    <div className="text-[10px] text-muted-foreground">participantes</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{s.totalItems}</div>
                    <div className="text-[10px] text-muted-foreground">itens</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${s.approvalRate >= 70 ? "text-emerald-600" : "text-amber-600"}`}>
                      {s.approvalRate}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">aprovação</div>
                  </div>
                </div>
                {/* Mini breakdown por categoria */}
                <div className="space-y-1">
                  {CAT_ORDER.map((cat) => {
                    const { total, approved } = s.byCategory[cat];
                    if (total === 0) return null;
                    return (
                      <div key={cat} className="flex items-center gap-2 text-xs">
                        <span className="w-24 truncate text-muted-foreground">{CAT_LABEL[cat]}</span>
                        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.round((approved / total) * 100)}%`, backgroundColor: CAT_COLOR[cat] }}
                          />
                        </div>
                        <span className="w-10 text-right text-muted-foreground">
                          {approved}/{total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          {/* Gráfico de linha: Taxa de aprovação */}
          {stats.length >= 2 && (
            <Card className="p-4 sm:p-5">
              <h2 className="font-semibold mb-4 text-sm">Evolução da taxa de aprovação entre ciclos</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="ciclo" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line
                    type="monotone"
                    dataKey="Taxa de aprovação (%)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Gráfico de barras: aprovados por categoria */}
          {stats.length >= 1 && (
            <Card className="p-4 sm:p-5">
              <h2 className="font-semibold mb-4 text-sm">Itens aprovados por categoria e ciclo</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="ciclo" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Forças" fill={CAT_COLOR.strength} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Fraquezas" fill={CAT_COLOR.weakness} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Oportunidades" fill={CAT_COLOR.opportunity} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Ameaças" fill={CAT_COLOR.threat} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Participação */}
          {stats.length >= 2 && (
            <Card className="p-4 sm:p-5">
              <h2 className="font-semibold mb-4 text-sm">Participação por ciclo</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="ciclo" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Participantes" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Itens validados" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
