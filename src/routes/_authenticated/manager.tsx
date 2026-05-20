import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout transparente — apenas passa o conteúdo para as rotas filhas:
// /manager        → manager.index.tsx (ManagerPanel)
// /manager/results        → manager.results.tsx
// /manager/consolidate    → manager.consolidate.tsx
// /manager/action-plan    → manager.action-plan.tsx
// /manager/analytics      → manager.analytics.tsx
export const Route = createFileRoute("/_authenticated/manager")({
  component: () => <Outlet />,
});
