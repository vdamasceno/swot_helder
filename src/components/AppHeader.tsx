import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, X, ClipboardList, BarChart2, Settings, ListChecks } from "lucide-react";

const linkCls = "text-sm font-medium px-3 py-2 rounded-md hover:bg-secondary transition-colors";
const activeCls = "bg-secondary";
const mobileLinkCls = "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-secondary transition-colors";

export function AppHeader() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" onClick={close}>
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {role === "gestor" ? (
            <>
              <Link to="/manager" className={linkCls} activeProps={{ className: activeCls }}>
                Painel do Gestor
              </Link>
              <Link to="/manager/results" search={{}} className={linkCls} activeProps={{ className: activeCls }}>
                Resultados R2
              </Link>
              <Link to="/manager/action-plan" search={{}} className={linkCls} activeProps={{ className: activeCls }}>
                Plano de Ação
              </Link>
            </>
          ) : (
            <>
              <Link to="/swot" className={linkCls} activeProps={{ className: activeCls }}>
                Minha Avaliação
              </Link>
              <Link to="/validation" className={linkCls} activeProps={{ className: activeCls }}>
                Rodada 2 — Validação
              </Link>
            </>
          )}
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
          <Button size="sm" variant="ghost" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-card/95 px-4 py-3 space-y-1">
          {role === "gestor" ? (
            <>
              <Link to="/manager" onClick={close} className={mobileLinkCls} activeProps={{ className: activeCls }}>
                <Settings className="size-4 text-muted-foreground" /> Painel do Gestor
              </Link>
              <Link to="/manager/results" search={{}} onClick={close} className={mobileLinkCls} activeProps={{ className: activeCls }}>
                <BarChart2 className="size-4 text-muted-foreground" /> Resultados R2
              </Link>
              <Link to="/manager/action-plan" search={{}} onClick={close} className={mobileLinkCls} activeProps={{ className: activeCls }}>
                <ListChecks className="size-4 text-muted-foreground" /> Plano de Ação
              </Link>
            </>
          ) : (
            <>
              <Link to="/swot" onClick={close} className={mobileLinkCls} activeProps={{ className: activeCls }}>
                <ClipboardList className="size-4 text-muted-foreground" /> Minha Avaliação
              </Link>
              <Link to="/validation" onClick={close} className={mobileLinkCls} activeProps={{ className: activeCls }}>
                <ListChecks className="size-4 text-muted-foreground" /> Rodada 2 — Validação
              </Link>
            </>
          )}
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
