import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Users, Sparkles, Calendar, BarChart2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<{ openPeriod?: { name: string; year: number } | null; myEntries?: number; pendingProfs?: number; totalProfs?: number }>({});

  useEffect(() => {
    (async () => {
      const { data: period } = await supabase
        .from("evaluation_periods")
        .select("id,name,year")
        .eq("is_open", true)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const next: typeof stats = { openPeriod: period };
      if (period && profile) {
        const { count } = await supabase
          .from("swot_entries")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .eq("period_id", period.id);
        next.myEntries = count ?? 0;
      }
      if (role === "gestor") {
        const { count: pending } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        const { count: total } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved");
        next.pendingProfs = pending ?? 0;
        next.totalProfs = total ?? 0;
      }
      setStats(next);
    })();
  }, [profile, role]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Olá, {profile?.full_name?.split(" ")[0]}.</h1>
        <p className="text-muted-foreground mt-1">
          {role === "gestor"
            ? "Painel de coordenação do programa."
            : "Sua contribuição é parte essencial do diagnóstico estratégico do programa."}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Período atual</div>
              <div className="font-semibold mt-1">
                {stats.openPeriod ? `${stats.openPeriod.name} · ${stats.openPeriod.year}` : "Nenhum período aberto"}
              </div>
            </div>
            <Calendar className="size-5 text-primary" />
          </div>
        </Card>

        {role === "professor" && (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Suas respostas</div>
                <div className="font-semibold mt-1">{stats.myEntries ?? 0} apontamentos</div>
              </div>
              <ClipboardList className="size-5 text-primary" />
            </div>
          </Card>
        )}

        {role === "gestor" && (
          <>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Docentes ativos</div>
                  <div className="font-semibold mt-1">{stats.totalProfs ?? 0}</div>
                </div>
                <Users className="size-5 text-primary" />
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Aguardando aprovação</div>
                  <div className="font-semibold mt-1">{stats.pendingProfs ?? 0}</div>
                </div>
                <Sparkles className="size-5 text-accent-foreground" />
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {role === "professor" && (
          <>
            <Card className="p-6">
              <h2 className="font-semibold text-lg">Rodada 1 · Brainstorm</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Registre Forças e Fraquezas por indicador CAPES e Ameaças/Oportunidades em seção geral.
              </p>
              <Link to="/swot" className="inline-block mt-4">
                <Button>Abrir formulário</Button>
              </Link>
            </Card>
            <Card className="p-6">
              <h2 className="font-semibold text-lg">Rodada 2 · Validação</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Marque Concordo/Discordo/Neutro nos itens consolidados pela Comissão e indique a prioridade temporal.
              </p>
              <Link to="/validation" className="inline-block mt-4">
                <Button variant="outline">Validar itens</Button>
              </Link>
            </Card>
          </>
        )}
        {role === "gestor" && (
          <>
            <Card className="p-6">
              <h2 className="font-semibold text-lg">Painel do gestor</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Aprovar docentes, abrir/fechar ciclo de avaliação e visualizar progresso.
              </p>
              <Link to="/manager" className="inline-block mt-4">
                <Button>Acessar painel</Button>
              </Link>
            </Card>
            <Card className="p-6">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <BarChart2 className="size-4 text-primary" /> Resultados & Plano de Ação
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Consulte a Matriz Diagnóstica SWOT gerada pela Rodada 2 e elabore o Plano de Ação estratégico.
              </p>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Link to="/manager/results">
                  <Button variant="outline" size="sm">
                    <BarChart2 className="size-4 mr-1" /> Ver Resultados
                  </Button>
                </Link>
                <Link to="/manager/action-plan">
                  <Button variant="outline" size="sm">
                    <ClipboardList className="size-4 mr-1" /> Plano de Ação
                  </Button>
                </Link>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
