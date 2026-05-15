import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  CAPES_INDICATORS,
  GENERAL_ITEM_CODE,
  MAX_ENTRIES_PER_BUCKET,
  PARTICIPANT_LABELS,
  indicatorsFor,
  type CapesIndicator,
  type SwotCategory,
} from "@/lib/swot-items";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Lock, CalendarRange, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/swot")({
  component: SwotForm,
});

interface Entry {
  id?: string;
  item_code: string;
  category: SwotCategory;
  content: string;
  position: number;
  _dirty?: boolean;
  _new?: boolean;
}

type Period = {
  id: string;
  name: string;
  year: number;
  is_open: boolean;
  phase: "rodada1" | "consolidacao" | "rodada2" | "encerrado";
};

const GENERAL_TAB = "__general__";

function SwotForm() {
  const { user, profile } = useAuth();
  const participantType = (profile?.participant_type ?? "docente") as "docente" | "discente" | "tecnico" | "egresso";

  const indicators = useMemo<CapesIndicator[]>(() => indicatorsFor(participantType), [participantType]);

  const [periods, setPeriods] = useState<Period[]>([]);
  const [period, setPeriod] = useState<Period | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(indicators[0]?.code ?? GENERAL_TAB);

  useEffect(() => {
    (async () => {
      const { data: list } = await supabase
        .from("evaluation_periods")
        .select("id,name,year,is_open,phase")
        .order("opened_at", { ascending: false });
      const all = (list ?? []) as Period[];
      setPeriods(all);
      const auto = all.find((p) => p.is_open && p.phase === "rodada1") ?? all.find((p) => p.is_open) ?? all[0] ?? null;
      setPeriod(auto);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!period || !user) return;
    (async () => {
      const { data } = await supabase
        .from("swot_entries")
        .select("id,item_code,category,content,position")
        .eq("period_id", period.id)
        .eq("user_id", user.id)
        .order("position");
      setEntries((data ?? []) as Entry[]);
    })();
  }, [period, user]);

  const canEdit = period?.is_open && period?.phase === "rodada1" && profile?.status === "approved";

  // Agrupa Forças/Fraquezas por indicador
  const byIndicator = useMemo(() => {
    const out: Record<string, { strength: Entry[]; weakness: Entry[] }> = {};
    for (const it of indicators) out[it.code] = { strength: [], weakness: [] };
    entries.forEach((e) => {
      if ((e.category === "strength" || e.category === "weakness") && out[e.item_code]) {
        out[e.item_code][e.category as "strength" | "weakness"].push(e);
      }
    });
    return out;
  }, [entries, indicators]);

  const generalBuckets = useMemo(() => {
    const out: { opportunity: Entry[]; threat: Entry[] } = { opportunity: [], threat: [] };
    entries.forEach((e) => {
      if (e.item_code === GENERAL_ITEM_CODE) {
        if (e.category === "opportunity") out.opportunity.push(e);
        if (e.category === "threat") out.threat.push(e);
      }
    });
    return out;
  }, [entries]);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  if (!period) {
    return (
      <Card className="p-8 text-center">
        <Lock className="size-8 mx-auto text-muted-foreground" />
        <h2 className="mt-3 font-semibold">Nenhum ciclo de avaliação aberto</h2>
        <p className="text-sm text-muted-foreground mt-1">Aguarde o gestor abrir um novo ciclo.</p>
      </Card>
    );
  }

  const addEntry = (itemCode: string, cat: SwotCategory) => {
    const existing = entries.filter((e) => e.item_code === itemCode && e.category === cat).length;
    if (existing >= MAX_ENTRIES_PER_BUCKET) {
      toast.warning(`Limite de ${MAX_ENTRIES_PER_BUCKET} apontamentos por categoria atingido.`);
      return;
    }
    setEntries((prev) => [
      ...prev,
      { item_code: itemCode, category: cat, content: "", position: prev.length, _dirty: true, _new: true },
    ]);
  };

  const updateEntry = (idx: number, content: string) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, content, _dirty: true } : e)));
  };

  const removeEntry = async (idx: number) => {
    const e = entries[idx];
    if (e.id) {
      const { error } = await supabase.from("swot_entries").delete().eq("id", e.id);
      if (error) return toast.error(error.message);
    }
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveAll = async () => {
    const dirty = entries.filter((e) => e._dirty && e.content.trim() && user && period);
    if (!dirty.length) return toast.info("Nada para salvar.");
    const inserts = dirty
      .filter((e) => e._new)
      .map((e, i) => ({
        user_id: user!.id,
        period_id: period!.id,
        item_code: e.item_code,
        category: e.category,
        content: e.content.trim(),
        position: i,
      }));
    const updates = dirty.filter((e) => !e._new && e.id);

    const errors: string[] = [];
    if (inserts.length) {
      const { error } = await supabase.from("swot_entries").insert(inserts);
      if (error) errors.push(error.message);
    }
    for (const u of updates) {
      const { error } = await supabase
        .from("swot_entries")
        .update({ content: u.content.trim() })
        .eq("id", u.id!);
      if (error) errors.push(error.message);
    }
    if (errors.length) return toast.error(errors.join("; "));

    const { data } = await supabase
      .from("swot_entries")
      .select("id,item_code,category,content,position")
      .eq("period_id", period!.id)
      .eq("user_id", user!.id)
      .order("position");
    setEntries((data ?? []) as Entry[]);
    toast.success("Respostas salvas.");
  };

  const renderBucket = (itemCode: string, cat: SwotCategory, label: string, helper: string) => {
    const items = entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.item_code === itemCode && e.category === cat);

    return (
      <Card className="p-5 border-l-4" style={{ borderLeftColor: `var(--${cat})` }}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold" style={{ color: `var(--${cat})` }}>{label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{helper}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {items.length}/{MAX_ENTRIES_PER_BUCKET} apontamentos
            </p>
          </div>
          {canEdit && items.length < MAX_ENTRIES_PER_BUCKET && (
            <Button size="sm" variant="ghost" onClick={() => addEntry(itemCode, cat)}>
              <Plus className="size-4" />
            </Button>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {items.length === 0 && (
            <p className="text-xs italic text-muted-foreground">Sem apontamentos ainda.</p>
          )}
          {items.map(({ e, i }) => (
            <div key={e.id ?? `new-${i}`} className="flex gap-2 items-start">
              <Textarea
                disabled={!canEdit}
                value={e.content}
                onChange={(ev) => updateEntry(i, ev.target.value)}
                placeholder="Descreva o apontamento em uma frase objetiva..."
                className="min-h-[72px]"
              />
              {canEdit && (
                <Button size="icon" variant="ghost" onClick={() => removeEntry(i)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const phaseLabel: Record<Period["phase"], string> = {
    rodada1: "Rodada 1 — Brainstorm",
    consolidacao: "Consolidação (Comissão)",
    rodada2: "Rodada 2 — Validação",
    encerrado: "Encerrado",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Análise SWOT · {period.name} ({period.year})</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarRange className="size-4 text-muted-foreground" />
            <Select
              value={period.id}
              onValueChange={(id) => {
                const next = periods.find((p) => p.id === id);
                if (next) setPeriod(next);
              }}
            >
              <SelectTrigger className="w-[280px] h-9">
                <SelectValue placeholder="Selecione o ciclo" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {p.year} {p.is_open ? "(aberto)" : "(encerrado)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">{phaseLabel[period.phase]}</Badge>
            <Badge variant="secondary">{PARTICIPANT_LABELS[participantType]}</Badge>
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
          <p className="text-sm text-muted-foreground max-w-3xl">
            Você está respondendo a Rodada 1 (Brainstorm). Para cada indicador da ficha CAPES preencha até{" "}
            {MAX_ENTRIES_PER_BUCKET} <strong>Forças</strong> e até {MAX_ENTRIES_PER_BUCKET}{" "}
            <strong>Fraquezas</strong>. As <strong>Ameaças e Oportunidades</strong> são respondidas em uma seção
            geral única ao final.
          </p>
        </div>
        {canEdit && (
          <Button onClick={saveAll}>
            <Save className="size-4 mr-2" /> Salvar tudo
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 p-1">
            {indicators.map((it) => (
              <TabsTrigger key={it.code} value={it.code} className="text-xs">
                {it.code}
              </TabsTrigger>
            ))}
            <TabsTrigger value={GENERAL_TAB} className="text-xs gap-1">
              <AlertTriangle className="size-3" /> AM/OP (Geral)
            </TabsTrigger>
          </TabsList>
        </div>

        {indicators.map((item) => (
          <TabsContent key={item.code} value={item.code} className="mt-6">
            <Card className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Indicador CAPES</div>
              <h2 className="font-semibold mt-1">{item.code} · {item.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </Card>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {renderBucket(item.code, "strength", "Forças (PF)", "Pontos positivos internos a manter e potencializar.")}
              {renderBucket(item.code, "weakness", "Fraquezas (FR)", "Pontos negativos internos sobre os quais o programa pode atuar.")}
            </div>
          </TabsContent>
        ))}

        <TabsContent value={GENERAL_TAB} className="mt-6">
          <Card className="p-5 border-2 border-dashed">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Seção Geral</div>
            <h2 className="font-semibold mt-1">Ameaças e Oportunidades</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
              <strong>Fatores externos</strong> ao programa, sem vínculo com indicador específico da ficha CAPES.
              Contexto institucional, regulatório, orçamentário, parcerias, editais, conjuntura nacional e
              internacional. Até {MAX_ENTRIES_PER_BUCKET} de cada.
            </p>
          </Card>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {renderBucket(
              GENERAL_ITEM_CODE,
              "opportunity",
              "Oportunidades (OP)",
              "Fatores externos que o programa pode aproveitar.",
            )}
            {renderBucket(
              GENERAL_ITEM_CODE,
              "threat",
              "Ameaças (AM)",
              "Fatores externos que podem prejudicar o programa.",
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Você marcou {generalBuckets.opportunity.length} oportunidade(s) e {generalBuckets.threat.length} ameaça(s).
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
