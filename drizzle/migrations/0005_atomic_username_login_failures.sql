CREATE OR REPLACE FUNCTION public.record_login_failure(_username text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts AS attempts (username, failed_count, locked_until, updated_at)
  VALUES (_username, 1, NULL, now())
  ON CONFLICT (username) DO UPDATE SET
    failed_count = CASE
      WHEN attempts.locked_until > now() THEN attempts.failed_count
      WHEN attempts.locked_until IS NOT NULL THEN 1
      WHEN attempts.failed_count + 1 >= 5 THEN 0
      ELSE attempts.failed_count + 1 END,
    locked_until = CASE
      WHEN attempts.locked_until > now() THEN attempts.locked_until
      WHEN attempts.locked_until IS NOT NULL THEN NULL
      WHEN attempts.failed_count + 1 >= 5 THEN now() + interval '15 minutes'
      ELSE NULL END,
    updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.record_login_failure(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_failure(text) TO service_role;
COMMENT ON FUNCTION public.record_login_failure(text) IS 'Atomic failed login accounting: five failures lock a username for fifteen minutes. Server only.';