import { Navigate } from "react-router-dom";
import { useAuth, useUserRoles, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}) {
  const { user, loading } = useAuth();
  const { data: roles = [], isLoading: rolesLoading } = useUserRoles(user?.id);

  if (loading || (allowedRoles && rolesLoading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !roles.some((r) => allowedRoles.includes(r.role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
