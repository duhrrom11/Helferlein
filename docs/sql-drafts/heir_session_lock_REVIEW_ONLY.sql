-- REVIEW ONLY / NEVER RUN ON PRODUCTION WITHOUT INDEPENDENT AUTH-ROLE REVIEW.
-- In CI this function is created by the isolated postgres admin and granted
-- ONLY to heir_ci_backend. It pins a live auth session row until COMMIT.
-- The app role itself gets NO UPDATE/DELETE on auth.sessions.
\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_database() <> 'helferlein_heir_ci' THEN
  RAISE EXCEPTION 'Refusing to install session guard outside CI';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION heir_private.heir_lock_active_session(
  p_user_id uuid, p_session_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE found_session uuid;
BEGIN
  SELECT id INTO found_session
  FROM auth.sessions
  WHERE id=p_session_id AND user_id=p_user_id
  FOR KEY SHARE;
  RETURN found_session IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION heir_private.heir_lock_active_session(uuid,uuid) FROM PUBLIC;
