import { lazy, Suspense } from "react";
import { useAuth, useAccessState, useProfile } from "@/hooks/useAuth";

const MafeChat = lazy(() => import("@/components/FloraChat").then(module => ({ default: module.MafeChat })));

export function AuthenticatedAssistant() {
  const { user, loading } = useAuth();
  const { data: access, isLoading, isError } = useAccessState(user?.id);
  const { data: profile } = useProfile(user?.id);
  if (loading || !user || isLoading || isError || access?.must_change_password || profile?.ativo !== true) return null;
  return <Suspense fallback={null}><MafeChat /></Suspense>;
}