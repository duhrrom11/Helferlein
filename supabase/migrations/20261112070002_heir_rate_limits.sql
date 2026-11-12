-- NOT EXECUTED. Requires 20261112070000 and 20261112070001.
-- Fixed UTC-independent DB-clock windows; no IPs, JWTs, tokens or hashes stored.
BEGIN;
CREATE TABLE nachlass_private.heir_rate_limits (
  actor_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('issue','revoke','redeem')),
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 1000),
  PRIMARY KEY (actor_id, operation, window_start)
);
ALTER TABLE nachlass_private.heir_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nachlass_private.heir_rate_limits FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.consume_heir_rate_limit_atomic(
  p_actor_id uuid, p_operation text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_limit integer;
  v_window timestamptz;
  v_attempts integer;
BEGIN
  IF p_actor_id IS NULL OR p_operation IS NULL THEN RETURN false; END IF;
  v_limit := CASE p_operation
    WHEN 'issue' THEN 5
    WHEN 'revoke' THEN 20
    WHEN 'redeem' THEN 10
    ELSE NULL END;
  IF v_limit IS NULL THEN RETURN false; END IF;
  v_window := to_timestamp(floor(extract(epoch FROM clock_timestamp()) / 3600) * 3600);
  INSERT INTO nachlass_private.heir_rate_limits(actor_id, operation, window_start, attempts)
  VALUES(p_actor_id, p_operation, v_window, 1)
  ON CONFLICT (actor_id, operation, window_start)
  DO UPDATE SET attempts = nachlass_private.heir_rate_limits.attempts + 1
    WHERE nachlass_private.heir_rate_limits.attempts < v_limit
  RETURNING attempts INTO v_attempts;
  RETURN v_attempts IS NOT NULL AND v_attempts <= v_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_heir_rate_limit_atomic(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_heir_rate_limit_atomic(uuid,text) TO service_role;
COMMIT;
