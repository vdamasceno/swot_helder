import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Lock, LockOpen, ArrowRight, ListChecks, UserCog, BarChart2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Phase = "rodada1" | "consolidacao" | "rodada2" | "encerrado";
const PHASE_LABEL: Record<Phase, string> = {
  rodada1: "Rodada 1 — Brainstorm",
  consolidacao: "Consolidação (Comissão)",
  rodada2: "Rodada 2 — Validação",
  encerrado: "Encerrado",
};
const NEXT_PHASE: Record<Phase, Phase | null> = {
  rodada1: "consolidacao",
  consolidacao: "rodada2",
  rodada2: "encerrado",
  encerrado: null,
};

export const Route = createFileRoute("/_authenticated/manager")({
  component: ManagerPanel,
});

type ParticipantType = "docente" | "discente" | "tecnico" | "egresso";

const PARTICIPANT_LABELS: Record<ParticipantType, string> = {
  docente: "Docente",
  discente: "Discente",
  tecnico: "Técnico-Administrativo",
  egresso: "Egresso",
};

const PARTICIPANT_COLORS: Record<ParticipantType, string> = {
  docente: "bg-blue-100 text-blue-800",
  discente: "bg-green-100 text-green-800",
  tecnico: "bg-orange-100 text-orange-800",
  egresso: "bg-purple-100 text-purple-800",
};

interface Profile {
  id: string;
  full_name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  participant_type: ParticipantType;
  is_gestor?: boolean;
}
interface Period {
  id: string;
  name: string;
  year: number;
  is_open: boolean;
  opened_at: string;
  closed_at: string | null;
  phase: Phase;
  concord_threshold: number;
  response_days: number;
}

function ProfileBadge({ profile }: { profile: Profile }) {
  const pt = profile.participant_type ?? "docente";
  const ptLabel = PARTICIPANT_LABELS[pt] ?? pt;
  const ptColor = PARTICIPANT_COLORS[pt] ?? "bg-gray-100 text-gray-800";
  const label = profile.is_gestor ? `Gestor | ${ptLabel}` : ptLabel;
  const colorClass = profile.is_gestor ? "bg-red-100 text-red-800" : ptColor;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function ManagerPanel() {
  const { role } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear());

  const refresh = async () => {
    const [{ data: profs }, { data: pers }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,status,participant_type").order("created_at"),
      supabase.from("evaluation_periods").select("*").order("opened_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const gestorIds = new Set((roles ?? []).filter((r: any) => r.role === "gestor").map((r: any) => r.user_id));
    const profsWithRole = (profs ?? []).map((p: any) => ({ ...p, is_gestor: gestorIds.has(p.id) }));
    setProfiles(profsWithRole as Profile[]);
    setPeriods((pers ?? []) as Period[]);

    const open = (pers ?? []).find((p: any) => p.is_open);
    if (open) {
      const { data: counts } = await supabase
        .from("swot_entries")
        .select("user_id")
        .eq("period_id", open.id);
      const map: Record<string, number> = {};
      (counts ?? []).forEach((c: any) => (map[c.user_id] = (map[c.user_id] ?? 0) + 1));
      setProgress(map);
    } else {
      setProgress({});
    }
  };

  useEffect(() => {
    if (role === "gestor") refresh();
  }, [role]);

  if (role !== "gestor") {
    return <p className="text-sm text-muted-foreground">Acesso restrito ao gestor.</p>;
  }

  const setStatus = async (id: string, status: Profile["status"]) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado.");
    refresh();
  };

  const openPeriod = async () => {
    if (!newName.trim()) return toast.error("Informe o nome do ciclo.");
    if (periods.some((p) => p.is_open)) {
      return toast.error("Feche o ciclo atual antes de abrir um novo.");
    }
    const { error } = await supabase.from("evaluation_periods").insert({
      name: newName.trim(),
      year: newYear,
      is_open: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Novo ciclo aberto.");
    setNewName("");
    refresh();
  };

  const togglePeriod = async (p: Period) => {
    const { error } = await supabase
      .from("evaluation_periods")
      .update({ is_open: !p.is_open, closed_at: !p.is_open ? null : new Date().toISOString() })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const advancePhase = async (p: Period) => {
    const next = NEXT_PHASE[p.phase];
    if (!next) return toast.info("Ciclo já encerrado.");
    if (p.phase === "consolidacao") {
      const { count } = await supabase
        .from("consolidated_items")
        .select("*", { count: "exact", head: true })
        .eq("period_id", p.id);
      if (!count) {
        return toast.error("Consolide os itens antes de avançar para a Rodada 2.");
      }
    }
    const { error } = await supabase
      .from("evaluation_periods")
      .update({ phase: next })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`Fase avançada para ${PHASE_LABEL[next]}.`);
    refresh();
  };

  const changeParticipantType = async (id: string, participant_type: ParticipantType) => {
    const { error } = await supabase.from("profiles").update({ participant_type }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tipo de participante atualizado.");
    refresh();
  };

  const updateThresholds = async (p: Period, patch: Partial<Pick<Period, "concord_threshold" | "response_days">>) => {
    const { error } = await supabase.from("evaluation_periods").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    refresh();
  };


  const pending = profiles.filter((p) => p.status === "pending");
  const approved = profiles.filter((p) => p.status === "approved");
  const openPer = periods.find((p) => p.is_open);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel do Gestor</h1>
          <p className="text-sm text-muted-foreground">Aprove participantes e administre os ciclos de avaliação.</p>
        </div>
        <Link to="/manager/analytics">
          <Button variant="outline" size="sm">
            <BarChart2 className="size-4 mr-2" /> Análise Comparativa
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Ciclos de avaliação</h2>
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome do ciclo</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Avaliação Quadrienal" />
            </div>
            <div>
              <Label>Ano</Label>
              <Input type="number" value={newYear} onChange={(e) => setNewYear(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={openPeriod} disabled={!!openPer}>Abrir novo ciclo</Button>
        </div>
        <div className="divide-y border-t">
          {periods.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhum ciclo criado.</p>}
          {periods.map((p) => (
            <div key={p.id} className="py-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-medium">{p.name} · {p.year}</div>
                  <div className="text-xs text-muted-foreground">
                    Aberto em {new Date(p.opened_at).toLocaleDateString("pt-BR")}
                    {p.closed_at && ` · Fechado em ${new Date(p.closed_at).toLocaleDateString("pt-BR")}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{PHASE_LABEL[p.phase]}</Badge>
                  <Badge variant={p.is_open ? "default" : "secondary"}>
                    {p.is_open ? "Aberto" : "Fechado"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => togglePeriod(p)}>
                    {p.is_open ? <Lock className="size-4 mr-1" /> : <LockOpen className="size-4 mr-1" />}
                    {p.is_open ? "Fechar" : "Reabrir"}
                  </Button>
                  {NEXT_PHASE[p.phase] && p.is_open && (
                    <Button size="sm" onClick={() => advancePhase(p)}>
                      <ArrowRight className="size-4 mr-1" /> Avançar p/ {PHASE_LABEL[NEXT_PHASE[p.phase]!]}
                    </Button>
                  )}
                  {p.phase === "consolidacao" && (
                    <Link to="/manager/consolidate">
                      <Button size="sm" variant="secondary">
                        <ListChecks className="size-4 mr-1" /> Consolidar
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <Label className="text-xs">% concordância (Rodada 2)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={p.concord_threshold}
                    onChange={(e) => updateThresholds(p, { concord_threshold: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Prazo de resposta (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={p.response_days}
                    onChange={(e) => updateThresholds(p, { response_days: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Cadastros pendentes ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cadastro aguardando.</p>}
        <div className="divide-y">
          {pending.map((p) => (
            <div key={p.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{p.full_name}</span>
                  <ProfileBadge profile={p} />
                </div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => setStatus(p.id, "approved")}>
                  <Check className="size-4 mr-1" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "rejected")}>
                  <X className="size-4 mr-1" /> Recusar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Participantes aprovados ({approved.length})</h2>
        <div className="divide-y">
          {approved.map((p) => (
            <div key={p.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{p.full_name}</span>
                  <ProfileBadge profile={p} />
                </div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {openPer && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {progress[p.id] ?? 0} apontamentos
                  </span>
                )}
                <Select
                  value={p.participant_type}
                  onValueChange={(v) => changeParticipantType(p.id, v as ParticipantType)}
                >
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <UserCog className="size-3 mr-1 shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docente">Docente</SelectItem>
                    <SelectItem value="discente">Discente</SelectItem>
                    <SelectItem value="tecnico">Técnico-Administrativo</SelectItem>
                    <SelectItem value="egresso">Egresso</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setStatus(p.id, "rejected")}>
                  Suspender
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
