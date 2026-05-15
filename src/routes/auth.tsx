import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoUnifa from "@/assets/logo-unifa.png";
import heroUnifa from "@/assets/hero-unifa.png";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).catch("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [participantType, setParticipantType] = useState<"docente" | "discente" | "tecnico" | "egresso">("docente");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, participant_type: participantType },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Cadastro enviado! Verifique seu e-mail e aguarde aprovação do gestor.");
        navigate({ to: "/auth", search: { mode: "login" } });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro de autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Painel esquerdo */}
      <div className="hidden md:flex bg-primary text-primary-foreground flex-col overflow-hidden relative">
        {/* Imagem hero ocupa todo o fundo */}
        <img
          src={heroUnifa}
          alt="Militar da FAB e pesquisadora da UNIFA"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
        />
        {/* Conteúdo sobreposto */}
        <div className="relative z-10 flex flex-col h-full p-10 justify-between">
          {/* Topo: logo UNIFA */}
          <div className="flex items-center gap-3">
            <img src={logoUnifa} alt="UNIFA" className="h-14 w-14 object-contain drop-shadow-lg" />
            <div className="leading-tight">
              <div className="text-base font-bold tracking-wide drop-shadow">UNIFA</div>
              <div className="text-[10px] uppercase tracking-widest opacity-80">Universidade da Força Aérea</div>
            </div>
          </div>

          {/* Rodapé: citação + crédito */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight drop-shadow-lg leading-snug">
              "Estratégia exige visão coletiva."
            </h2>
            <p className="mt-3 text-sm opacity-90 drop-shadow">
              SWOT-PPG reúne a percepção de cada docente para construir um diagnóstico
              institucional único do seu Programa de Pós-Graduação.
            </p>
            <p className="mt-6 text-xs opacity-60">CAPES · Área 21 · Stricto Sensu</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="flex flex-col items-center gap-2 mb-2">
            <Logo size={80} withText={false} />
            <div className="text-center leading-tight">
              <div className="text-xl font-bold tracking-tight text-primary">SWOT-PPG</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Análise Estratégica · PPG
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {isSignup ? "Criar conta" : "Entrar no SWOT-PPG"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignup
                ? "Após o cadastro, o gestor precisa aprovar seu acesso."
                : "Use suas credenciais institucionais."}
            </p>
          </div>

          {isSignup && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ptype">Tipo de participante</Label>
                <select
                  id="ptype"
                  required
                  value={participantType}
                  onChange={(e) => setParticipantType(e.target.value as "docente" | "discente" | "tecnico" | "egresso")}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="docente">Docente Permanente / Colaborador</option>
                  <option value="discente">Discente</option>
                  <option value="tecnico">Técnico-Administrativo</option>
                  <option value="egresso">Egresso</option>
                </select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : isSignup ? "Cadastrar" : "Entrar"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            {isSignup ? "Já tem conta?" : "Ainda não cadastrado?"}{" "}
            <Link
              to="/auth"
              search={{ mode: isSignup ? "login" : "signup" }}
              className="text-primary font-medium hover:underline"
            >
              {isSignup ? "Entrar" : "Criar conta"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
