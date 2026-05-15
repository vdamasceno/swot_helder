import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, X, ClipboardList, BarChart2, Sparkles, Settings, ListChecks } from "lucide-react";

export function AppHeader() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const professorLinks = [
    { to: "/swot", label: "Minha Avaliação", icon: ClipboardList },
    { to: "/validation", label: "Rodada 2 — Validação", icon: ListChecks },
  ] as const;

  const gestorLinks = [
    { to: "/manager", label: "Painel do Gestor", icon: Settings },
    { to: "/manager/results", label: "Resultados R2", icon: BarChart2 },
    { to: "/manager/action-plan", label: "Plano de Ação", icon: ListChecks },
    { to: "/manager/compile", label: "Compilação IA", icon: Sparkles },
  ] as const;

  const navLinks = role === "gestor" ? gestorLinks : professorLinks;

  return (
    <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary transition-colors"
              activeProps={{ className: "bg-secondary" }}
            >
              {label}
            </Link>
          ))}
          <div className="flex flex-col items-end ml-4 pl-4 border-l border-border/50">
            <span className="text-xs font-medium leading-tight">{profile?.full_name}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {role === "gestor" ? "Gestor" : "Participante"}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleSignOut} title="Sair">
            <LogOut className="size-4" />
          </Button>
        </nav>

        {/* Mobile: user name + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <span className="text-xs text-muted-foreground max-w-[120px] truncate">{profile?.full_name}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-card/95 px-4 py-3 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-secondary transition-colors"
              activeProps={{ className: "bg-secondary" }}
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </Link>
          ))}
          <div className="border-t border-border/40 pt-3 mt-2">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
