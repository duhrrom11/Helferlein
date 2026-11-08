-- PROPOSAL ONLY. DO NOT APPLY TO PRODUCTION WITHOUT REVIEW, BACKUP AND APPROVAL.
-- Helferlein WG: replace URL-ID-only NPoint with Supabase Auth + RLS.
-- Existing public.user_data and all current local data remain untouched.
BEGIN;

CREATE TABLE IF NOT EXISTS public.wg_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.wg_members (
  space_id uuid NOT NULL REFERENCES public.wg_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(space_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.wg_documents (
  space_id uuid PRIMARY KEY REFERENCES public.wg_spaces(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(payload)='object'),
  version bigint NOT NULL DEFAULT 0 CHECK (version>=0),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wg_members_by_user_idx ON public.wg_members (user_id,space_id);

ALTER TABLE public.wg_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wg_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wg_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.wg_spaces,public.wg_members,public.wg_documents FROM anon,authenticated;
GRANT SELECT ON public.wg_spaces,public.wg_members,public.wg_documents TO authenticated;

-- SECURITY DEFINER bypasses membership-table RLS recursion. Only a boolean
-- comes back; it does not expose the member directory to outsiders.
CREATE OR REPLACE FUNCTION public.wg_is_member(p_space uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.wg_members m
   WHERE m.space_id=p_space AND m.user_id=auth.uid()
 );
$$;
REVOKE ALL ON FUNCTION public.wg_is_member(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wg_is_member(uuid) TO authenticated;

CREATE POLICY wg_spaces_member_read ON public.wg_spaces
FOR SELECT TO authenticated USING (public.wg_is_member(id));
CREATE POLICY wg_members_member_read ON public.wg_members
FOR SELECT TO authenticated USING (public.wg_is_member(space_id));
CREATE POLICY wg_documents_member_read ON public.wg_documents
FOR SELECT TO authenticated USING (public.wg_is_member(space_id));

-- Atomic creation; a user cannot choose a different owner or join arbitrarily.
CREATE OR REPLACE FUNCTION public.wg_create_space(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_user uuid:=auth.uid(); v_id uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;
 IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 120
    THEN RAISE EXCEPTION 'Invalid WG name'; END IF;
 INSERT INTO public.wg_spaces(name,owner_id) VALUES(btrim(p_name),v_user) RETURNING id INTO v_id;
 INSERT INTO public.wg_members(space_id,user_id,role) VALUES(v_id,v_user,'owner');
 INSERT INTO public.wg_documents(space_id,payload,updated_by) VALUES(v_id,'{}'::jsonb,v_user);
 RETURN v_id;
END;$$;
REVOKE ALL ON FUNCTION public.wg_create_space(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wg_create_space(text) TO authenticated;

-- Atomic compare-and-swap: prevents silent overwrite of another WG member's
-- edits. Client must display conflicts and offer manual reconciliation.
CREATE OR REPLACE FUNCTION public.wg_save_document(
 p_space uuid,p_expected_version bigint,p_payload jsonb
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_user uuid:=auth.uid(); v_next bigint;
BEGIN
 IF v_user IS NULL OR NOT public.wg_is_member(p_space)
    THEN RAISE EXCEPTION 'WG access denied' USING ERRCODE='42501'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
    OR octet_length(p_payload::text)>1000000
    THEN RAISE EXCEPTION 'Invalid WG payload'; END IF;
 UPDATE public.wg_documents
 SET payload=p_payload,version=version+1,updated_by=v_user,updated_at=now()
 WHERE space_id=p_space AND version=p_expected_version
 RETURNING version INTO v_next;
 IF v_next IS NULL THEN
    RAISE EXCEPTION 'WG document changed; reload before saving' USING ERRCODE='40001';
 END IF;
 RETURN v_next;
END;$$;
REVOKE ALL ON FUNCTION public.wg_save_document(uuid,bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wg_save_document(uuid,bigint,jsonb) TO authenticated;

-- Membership changes must be approved and designed separately; no public
-- invite or self-join function is provided in this initial migration.
COMMIT;
