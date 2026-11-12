-- NOT EXECUTED. Apply only after migrations 20261112070000 and 20261112070001.
-- This migration has never been applied; edit in place only before first deployment.
BEGIN;
CREATE TABLE nachlass_private.heir_rate_limits (
  actor_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('issue','redeem')),
  window_seconds integer NOT NULL CHECK (window_seconds IN (60, 3600)),
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 1000),
  PRIMARY KEY (actor_id, operation, window_seconds, window_start)
);
ALTER TABLE nachlass_private.heir_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nachlass_private.heir_rate_limits FROM PUBLIC, anon, authenticated;

-- One transaction for both windows; an exception rolls back both increments.
-- Every consumer must call this RPC with a server-verified actor UUID.
CREATE FUNCTION public.consume_heir_rate_limit_atomic(
  p_actor_id uuid, p_operation text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_seconds integer;
  v_limit integer;
  v_start timestamptz;
  v_attempts integer;
  v_now timestamptz;
BEGIN
  IF p_actor_id IS NULL OR p_operation NOT IN ('issue','redeem') OR p_operation IS NULL
  THEN RETURN false; END IF;
  v_now := clock_timestamp();
  -- Stable order for concurrent calls: short window before long window.
  FOREACH v_seconds IN ARRAY ARRAY[60, 3600] LOOP
    v_limit := CASE
      WHEN p_operation = 'issue' AND v_seconds = 60 THEN 2
      WHEN p_operation = 'issue' AND v_seconds = 3600 THEN 5
      WHEN p_operation = 'redeem' AND v_seconds = 60 THEN 3
      WHEN p_operation = 'redeem' AND v_seconds = 3600 THEN 10
      ELSE NULL END;
    v_start := to_timestamp(floor(extract(epoch FROM v_now) / v_seconds) * v_seconds);
    v_attempts := NULL;
    INSERT INTO nachlass_private.heir_rate_limits(
      actor_id, operation, window_seconds, window_start, attempts
    ) VALUES(p_actor_id, p_operation, v_seconds, v_start, 1)
    ON CONFLICT (actor_id, operation, window_seconds, window_start)
    DO UPDATE SET attempts = nachlass_private.heir_rate_limits.attempts + 1
      WHERE nachlass_private.heir_rate_limits.attempts < v_limit
    RETURNING attempts INTO v_attempts;
    IF v_attempts IS NULL THEN
      -- Normal quota denial; previous short-window consumption is intentional.
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_heir_rate_limit_atomic(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_heir_rate_limit_atomic(uuid,text) TO service_role;

-- Maintenance-only: no EXECUTE grant to service_role, anon or authenticated.
-- Explicit operator invocation only, in bounded batches; no cron or auto-delete.
CREATE FUNCTION nachlass_private.prune_heir_rate_limits(p_batch_size integer DEFAULT 500)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count integer;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 1000
  THEN RAISE EXCEPTION 'invalid_batch_size'; END IF;
  WITH expired AS (
    SELECT actor_id, operation, window_seconds, window_start
    FROM nachlass_private.heir_rate_limits
    WHERE window_start < clock_timestamp() - interval '48 hours'
    ORDER BY window_start
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM nachlass_private.heir_rate_limits AS target
  USING expired
  WHERE target.actor_id = expired.actor_id
    AND target.operation = expired.operation
    AND target.window_seconds = expired.window_seconds
    AND target.window_start = expired.window_start;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION nachlass_private.prune_heir_rate_limits(integer) FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
