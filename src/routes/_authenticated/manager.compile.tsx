import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { compileSwot } from "@/lib/ai.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/manager/compile")({
  component: CompilePage,
});

interface Result {
  period: { name: string; year: number };
  totalParticipants: number;
  totalEntries: number;
  executive_summary: string;
  items: { code: string; title: string; group: string; strength: string[]; weakness: string[] }[];
  general: { opportunity: string[]; threat: string[] };
}

function CompilePage() {
  const { role } = useAuth();
  const compileFn = useServerFn(compileSwot);
  const [periods, setPeriods] = useState<{ id: string; name: string; year: number; is_open: boolean }[]>([]);
  const [periodId, setPeriodId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("evaluation_periods")
        .select("id,name,year,is_open")
        .order("opened_at", { ascending: false });
      const list = (data ?? []) as typeof periods;
      setPeriods(list);
      if (list[0]) setPeriodId(list[0].id);
    })();
  }, []);

  if (role !== "gestor") return <p className="text-sm text-muted-foreground">Acesso restrito ao gestor.</p>;

  const run = async () => {
    if (!periodId) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await compileFn({ data: { periodId } });
      setResult(r as Result);
      toast.success("Análise consolidada gerada.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao consolidar.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Compilação SWOT por IA</h1>
          <p className="text-sm text-muted-foreground">
            Consolide as fichas de toda a comunidade do programa em um único relatório institucional.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-64">
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger><SelectValue placeholder="Selecione o ciclo" /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {p.year} {p.is_open ? "(aberto)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={run} disabled={loading || !periodId}>
            <Sparkles className="size-4 mr-2" />
            {loading ? "Consolidando..." : "Consolidar"}
          </Button>
          {result && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4 mr-2" /> Exportar PDF
            </Button>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-6 print:space-y-4">
          <Card className="p-6">
            <div className="text-xs uppercase tracking-wider text-primary font-semibold">Diagnóstico Institucional</div>
            <h2 className="text-xl font-bold mt-1">
              {result.period.name} · {result.period.year}
            </h2>
            <div className="text-xs text-muted-foreground mt-1">
              {result.totalParticipants} participantes · {result.totalEntries} apontamentos consolidados
            </div>
            <div className="mt-4 prose prose-sm max-w-none whitespace-pre-line text-foreground">
              {result.executive_summary}
            </div>
          </Card>

          {result.items.map((item) => (
            <Card key={item.code} className="p-6 print:break-inside-avoid">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">{item.group}</div>
              <h3 className="font-semibold mt-1">{item.code} · {item.title}</h3>
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <Block color="strength" label="Forças" arr={item.strength} />
                <Block color="weakness" label="Fraquezas" arr={item.weakness} />
              </div>
            </Card>
          ))}

          <Card className="p-6 print:break-inside-avoid border-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Seção Geral</div>
            <h3 className="font-semibold mt-1">Ameaças e Oportunidades (fatores externos)</h3>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <Block color="opportunity" label="Oportunidades" arr={result.general.opportunity} />
              <Block color="threat" label="Ameaças" arr={result.general.threat} />
            </div>
          </Card>
        </div>
      )}

      {!result && !loading && (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          Selecione um ciclo e clique em <strong>Consolidar</strong> para gerar a análise.
        </Card>
      )}
      {loading && (
        <Card className="p-10 text-center">
          <Sparkles className="size-6 mx-auto text-accent-foreground animate-pulse" />
          <p className="mt-3 text-sm text-muted-foreground">A IA está analisando todas as fichas...</p>
        </Card>
      )}
    </div>
  );
}

function Block({ color, label, arr }: { color: string; label: string; arr: string[] }) {
  return (
    <div
      className="p-3 rounded-md border-l-4"
      style={{ borderLeftColor: `var(--${color})`, background: `color-mix(in oklab, var(--${color}) 6%, transparent)` }}
    >
      <div className="text-xs font-semibold" style={{ color: `var(--${color})` }}>{label}</div>
      <ul className="mt-2 space-y-1 text-sm list-disc pl-4">
        {arr?.length ? arr.map((s, i) => <li key={i}>{s}</li>) : (
          <li className="italic text-muted-foreground list-none -ml-4">Sem apontamentos.</li>
        )}
      </ul>
    </div>
  );
}
