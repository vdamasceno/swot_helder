import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "login" } });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      {profile?.status === "pending" && (
        <div className="bg-accent/30 border-b border-accent/50 text-sm">
          <div className="mx-auto max-w-6xl px-6 py-3">
            Sua conta está <strong>aguardando aprovação</strong> do gestor. Algumas funcionalidades
            ficarão indisponíveis até lá.
          </div>
        </div>
      )}
      {profile?.status === "rejected" && (
        <div className="bg-destructive/10 border-b border-destructive/30 text-sm">
          <div className="mx-auto max-w-6xl px-6 py-3 text-destructive">
            Seu cadastro foi recusado pelo gestor. Entre em contato com a coordenação.
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
