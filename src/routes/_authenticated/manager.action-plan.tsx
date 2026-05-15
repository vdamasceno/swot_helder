import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Save, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/manager/action-plan")({
  component: ActionPlanPage,
});

type Period = {
  id: string;
  name: string;
  year: number;
  is_open: boolean;
  phase: string;
};

type ActionPlan = {
  id?: string;
  period_id: string;
  code: string;
  action: string;
  goal: string;
  verification_indicator: string;
  deadline_type: string;
  deadline_date: string;
  responsible: string;
  resources: string;
  position: number;
  _new?: boolean;
  _dirty?: boolean;
};

const DEADLINE_LABEL: Record<string, string> = {
  curto: "Curto prazo (≤ 12 meses)",
  medio: "Médio prazo (1–4 anos)",
  longo: "Longo prazo (> 4 anos)",
};

function ActionPlanPage() {
  const { role } = useAuth();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("evaluation_periods")
        .select("id,name,year,is_open,phase")
        .order("opened_at", { ascending: false });
      const list = (data ?? []) as Period[];
      setPeriods(list);
      const auto = list[0] ?? null;
      setPeriod(auto);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!period) return;
    (async () => {
      const { data } = await supabase
        .from("action_plans")
        .select("*")
        .eq("period_id", period.id)
        .order("position");
      setPlans((data ?? []) as ActionPlan[]);
    })();
  }, [period]);

  if (role !== "gestor") return <p className="text-sm text-muted-foreground">Acesso restrito ao gestor.</p>;
  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const addRow = () => {
    if (!period) return;
    const next = plans.length + 1;
    const code = `A${String(next).padStart(2, "0")}`;
    setPlans((prev) => [
      ...prev,
      {
        period_id: period.id,
        code,
        action: "",
        goal: "",
        verification_indicator: "",
        deadline_type: "curto",
        deadline_date: "",
        responsible: "",
        resources: "",
        position: prev.length,
        _new: true,
        _dirty: true,
      },
    ]);
  };

  const update = (idx: number, patch: Partial<ActionPlan>) => {
    setPlans((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch, _dirty: true } : p)));
  };

  const removeRow = async (idx: number) => {
    const row = plans[idx];
    if (row.id) {
      const { error } = await supabase.from("action_plans").delete().eq("id", row.id);
      if (error) return toast.error(error.message);
    }
    setPlans((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    if (!period) return;
    const dirty = plans.filter((p) => p._dirty && p.action.trim());
    if (!dirty.length) return toast.info("Nada para salvar.");

    const inserts = dirty.filter((p) => p._new).map((p) => ({
      period_id: period.id,
      code: p.code,
      action: p.action.trim(),
      goal: p.goal.trim(),
      verification_indicator: p.verification_indicator.trim(),
      deadline_type: p.deadline_type,
      deadline_date: p.deadline_date.trim(),
      responsible: p.responsible.trim(),
      resources: p.resources.trim(),
      position: p.position,
    }));
    const updates = dirty.filter((p) => !p._new && p.id);

    const errs: string[] = [];
    if (inserts.length) {
      const { error } = await supabase.from("action_plans").insert(inserts);
      if (error) errs.push(error.message);
    }
    for (const u of updates) {
      const { error } = await supabase
        .from("action_plans")
        .update({
          code: u.code,
          action: u.action.trim(),
          goal: u.goal.trim(),
          verification_indicator: u.verification_indicator.trim(),
          deadline_type: u.deadline_type,
          deadline_date: u.deadline_date.trim(),
          responsible: u.responsible.trim(),
          resources: u.resources.trim(),
          position: u.position,
        })
        .eq("id", u.id!);
      if (error) errs.push(error.message);
    }
    if (errs.length) return toast.error(errs.join("; "));

    const { data } = await supabase
      .from("action_plans")
      .select("*")
      .eq("period_id", period.id)
      .order("position");
    setPlans((data ?? []) as ActionPlan[]);
    toast.success("Plano de ação salvo.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 print:hidden">
        <div>
          <Link to="/manager" className="text-xs text-muted-foreground hover:underline">← Painel do gestor</Link>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">Plano de Ação Estratégico</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Produto da Etapa 3 — defina ações, metas, prazos e responsáveis.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period?.id ?? ""} onValueChange={(id) => setPeriod(periods.find((p) => p.id === id) ?? null)}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Ciclo" /></SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} · {p.year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4 mr-1" /> Exportar PDF
          </Button>
          <Button size="sm" onClick={saveAll}>
            <Save className="size-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Plano de Ação Estratégico — PPGDHO</h1>
        {period && <p className="text-sm text-muted-foreground">{period.name} · {period.year}</p>}
      </div>

      {/* Table */}
      <Card className="p-4 sm:p-6">
        {/* Desktop table (hidden on mobile) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="p-2 font-semibold border text-xs w-12">Cód.</th>
                <th className="p-2 font-semibold border text-xs">Ação Estratégica</th>
                <th className="p-2 font-semibold border text-xs">Meta</th>
                <th className="p-2 font-semibold border text-xs w-36">Indicador de Verificação</th>
                <th className="p-2 font-semibold border text-xs w-36">Prazo</th>
                <th className="p-2 font-semibold border text-xs w-32">Responsável</th>
                <th className="p-2 font-semibold border text-xs w-32">Recursos</th>
                <th className="p-2 border w-8 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-muted-foreground italic text-sm">
                    Nenhuma ação cadastrada. Clique em "Adicionar ação" para começar.
                  </td>
                </tr>
              )}
              {plans.map((plan, idx) => (
                <tr key={plan.id ?? `new-${idx}`} className="align-top hover:bg-muted/20">
                  <td className="border p-1">
                    <Input
                      value={plan.code}
                      onChange={(e) => update(idx, { code: e.target.value.toUpperCase() })}
                      className="h-8 text-xs font-mono w-full"
                    />
                  </td>
                  <td className="border p-1">
                    <Textarea
                      value={plan.action}
                      onChange={(e) => update(idx, { action: e.target.value })}
                      className="min-h-[60px] text-xs resize-none"
                      placeholder="Descreva a ação estratégica..."
                    />
                  </td>
                  <td className="border p-1">
                    <Textarea
                      value={plan.goal}
                      onChange={(e) => update(idx, { goal: e.target.value })}
                      className="min-h-[60px] text-xs resize-none"
                      placeholder="Meta mensurável..."
                    />
                  </td>
                  <td className="border p-1">
                    <Textarea
                      value={plan.verification_indicator}
                      onChange={(e) => update(idx, { verification_indicator: e.target.value })}
                      className="min-h-[60px] text-xs resize-none"
                      placeholder="Como verificar?"
                    />
                  </td>
                  <td className="border p-1 space-y-1">
                    <Select value={plan.deadline_type} onValueChange={(v) => update(idx, { deadline_type: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(DEADLINE_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={plan.deadline_date}
                      onChange={(e) => update(idx, { deadline_date: e.target.value })}
                      className="h-7 text-xs"
                      placeholder="Data (opcional)"
                    />
                  </td>
                  <td className="border p-1">
                    <Input
                      value={plan.responsible}
                      onChange={(e) => update(idx, { responsible: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="Nome / cargo"
                    />
                  </td>
                  <td className="border p-1">
                    <Input
                      value={plan.resources}
                      onChange={(e) => update(idx, { resources: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="Recursos necessários"
                    />
                  </td>
                  <td className="border p-1 print:hidden">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeRow(idx)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-4">
          {plans.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Nenhuma ação cadastrada. Clique em "Adicionar ação" para começar.
            </p>
          )}
          {plans.map((plan, idx) => (
            <div key={plan.id ?? `new-${idx}`} className="border rounded-md p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono">{plan.code || `A${String(idx + 1).padStart(2, "0")}`}</Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(idx)}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
              {[
                { label: "Ação estratégica", key: "action", type: "textarea" },
                { label: "Meta", key: "goal", type: "textarea" },
                { label: "Indicador de verificação", key: "verification_indicator", type: "textarea" },
                { label: "Responsável", key: "responsible", type: "input" },
                { label: "Recursos", key: "resources", type: "input" },
              ].map(({ label, key, type }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  {type === "textarea" ? (
                    <Textarea
                      value={(plan as any)[key]}
                      onChange={(e) => update(idx, { [key]: e.target.value } as any)}
                      className="min-h-[50px] text-sm resize-none"
                    />
                  ) : (
                    <Input
                      value={(plan as any)[key]}
                      onChange={(e) => update(idx, { [key]: e.target.value } as any)}
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Prazo</Label>
                <Select value={plan.deadline_type} onValueChange={(v) => update(idx, { deadline_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEADLINE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 print:hidden">
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="size-4 mr-1" /> Adicionar ação
          </Button>
          <span className="text-xs text-muted-foreground">{plans.length} ação(ões)</span>
        </div>
      </Card>
    </div>
  );
}
