import { Navigate, useLocation } from "react-router-dom";
import { useAuth, useUserRoles, useAccessState, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  children,
  allowedRoles,
  allowPendingPassword = false,
}: {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  /** Only the first-access page may render while the password change is pending. */
  allowPendingPassword?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: roles = [], isLoading: rolesLoading } = useUserRoles(user?.id);
  const { data: access, isLoading: accessLoading, isError: accessError } = useAccessState(user?.id);

  if (loading || (user && accessLoading) || (allowedRoles && rolesLoading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowPendingPassword && (accessError || access?.must_change_password)) {
    const next = location.pathname + location.search;
    return <Navigate to={`/primeiro-acesso?next=${encodeURIComponent(next)}`} replace />;
  }

  if (allowedRoles && !roles.some((r) => allowedRoles.includes(r.role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
