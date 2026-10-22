-- Per-user access state: temporary password flag, expiry and username for in-app accounts.
CREATE TABLE public.user_access_security (
  user_id uuid PRIMARY KEY,
  username text UNIQUE,
  must_change_password boolean NOT NULL DEFAULT false,
  temp_password_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_access_security TO authenticated;
GRANT ALL ON public.user_access_security TO service_role;
ALTER TABLE public.user_access_security ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own access state readable" ON public.user_access_security
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.user_access_security IS 'Writes only via server functions (service_role). Never stores passwords.';

-- Failed login counter per username (lockout). Server-only, no client access.
CREATE TABLE public.login_attempts (
  username text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read login attempts" ON public.login_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.login_attempts TO authenticated;