import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Compass, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
      <header className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <Logo />
        <div className="flex gap-2">
          <Link to="/auth" search={{ mode: "login" }}>
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm">Cadastrar</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground bg-accent/40 rounded-full px-3 py-1">
              CAPES · Área 21 · Stricto Sensu
            </span>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-primary leading-[1.05]">
              Análise SWOT colaborativa para Programas de Pós-Graduação.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-prose">
              Cada docente preenche sua percepção dos itens da ficha de avaliação. O gestor consolida
              tudo em um único diagnóstico estratégico, com apoio de Inteligência Artificial.
            </p>
            <div className="mt-8 flex gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg">Criar conta</Button>
              </Link>
              <Link to="/auth" search={{ mode: "login" }}>
                <Button size="lg" variant="outline">Já tenho acesso</Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent rounded-3xl blur-2xl" />
            <div className="relative grid grid-cols-2 gap-3 p-6 bg-card rounded-2xl border shadow-xl">
              <SwotTile color="strength" label="Forças" />
              <SwotTile color="weakness" label="Fraquezas" />
              <SwotTile color="opportunity" label="Oportunidades" />
              <SwotTile color="threat" label="Ameaças" />
            </div>
          </div>
        </section>

        <section className="mt-24 grid md:grid-cols-3 gap-6">
          <Feature
            icon={<Compass className="size-5" />}
            title="10 itens da ficha CAPES"
            text="Programa, formação e impacto na sociedade — exatamente como exigido na avaliação stricto sensu."
          />
          <Feature
            icon={<ShieldCheck className="size-5" />}
            title="Controle de período"
            text="O gestor abre e encerra o ciclo de coleta. Edições só são possíveis enquanto o período está aberto."
          />
          <Feature
            icon={<Sparkles className="size-5" />}
            title="Consolidação por IA"
            text="Compilamos as fichas de todos os docentes em um único relatório SWOT estratégico, pronto para deliberação."
          />
        </section>
      </main>

      <footer className="border-t mt-24">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground flex justify-between">
          <span>© {new Date().getFullYear()} SWOT-PPG · Análise Estratégica para PPG</span>
          <span>Inspirado nas cores institucionais da FAB</span>
        </div>
      </footer>
    </div>
  );
}

function SwotTile({ color, label }: { color: "strength" | "weakness" | "opportunity" | "threat"; label: string }) {
  const cls = {
    strength: "bg-[color:var(--strength)]/10 border-[color:var(--strength)]/30 text-[color:var(--strength)]",
    weakness: "bg-[color:var(--weakness)]/10 border-[color:var(--weakness)]/30 text-[color:var(--weakness)]",
    opportunity: "bg-[color:var(--opportunity)]/10 border-[color:var(--opportunity)]/30 text-[color:var(--opportunity)]",
    threat: "bg-[color:var(--threat)]/10 border-[color:var(--threat)]/30 text-[color:var(--threat)]",
  }[color];
  return (
    <div className={`aspect-square rounded-xl border-2 flex items-center justify-center font-semibold ${cls}`}>
      {label}
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="p-6 rounded-xl border bg-card">
      <div className="size-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
