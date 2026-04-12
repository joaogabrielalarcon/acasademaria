import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface UserProfile {
  id: string;
  nome: string;
  email: string | null;
  area_id: string | null;
  telefone: string | null;
  avatar_url: string | null;
  ativo: boolean;
}

export type AppRole = "admin" | "administrativo" | "gestao_campo" | "responsavel_obra" | "operador_campo" | "arquitetura";

export interface UserRole {
  role: AppRole;
}

export const roleLabels: Record<AppRole, string> = {
  admin: "Direção",
  administrativo: "Administrativo",
  gestao_campo: "Coordenação de Campo",
  responsavel_obra: "Responsável de Obra",
  operador_campo: "Operador de Campo",
  arquitetura: "Arquitetura",
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // On logout, clear cached roles
        if (!session) {
          queryClient.removeQueries({ queryKey: ["user_roles"] });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    localStorage.removeItem("mfm_remember_user");
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!session,
  };
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!userId,
  });
}

export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["user_roles", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!userId,
    staleTime: Infinity,       // Never refetch automatically during the session
    gcTime: 1000 * 60 * 60,   // Keep in cache for 1 hour
  });
}

export function useIsAdmin(userId: string | undefined) {
  const { data: roles = [] } = useUserRoles(userId);
  return roles.some(r => r.role === "admin");
}

export function useIsAdminOrAdministrativo(userId: string | undefined) {
  const { data: roles = [] } = useUserRoles(userId);
  return roles.some(r => r.role === "admin" || r.role === "administrativo");
}

export function useIsManager(userId: string | undefined) {
  const { data: roles = [] } = useUserRoles(userId);
  return roles.some(r => r.role === "admin" || r.role === "administrativo" || r.role === "gestao_campo");
}

export function useHighestRole(userId: string | undefined): AppRole {
  const { data: roles = [] } = useUserRoles(userId);
  if (roles.length === 0) return "operador_campo";
  const priority: AppRole[] = ["admin", "administrativo", "gestao_campo", "responsavel_obra", "arquitetura", "operador_campo"];
  for (const p of priority) {
    if (roles.some(r => r.role === p)) return p;
  }
  return "operador_campo";
}

export function useHasAnyRole(userId: string | undefined, allowedRoles: AppRole[]) {
  const { data: roles = [] } = useUserRoles(userId);
  return roles.some(r => allowedRoles.includes(r.role));
}
