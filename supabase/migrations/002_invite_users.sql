-- ============================================================
-- RPC Function: invite_users_to_group
-- Allows frontend to add members by email. If they don't exist,
-- it creates a placeholder (ghost) user in auth.users so they
-- can be added to the group and participate in expenses.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.invite_users_to_group(p_group_id UUID, p_emails TEXT[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email TEXT;
  v_user_record RECORD;
BEGIN
  -- Verify caller is a group member
  IF NOT public.is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'Not authorized to invite members to this group';
  END IF;

  FOREACH v_email IN ARRAY p_emails
  LOOP
    v_email := lower(trim(v_email));
    IF v_email = '' THEN CONTINUE; END IF;

    -- Try to find existing user in auth.users
    SELECT id, last_sign_in_at INTO v_user_record FROM auth.users WHERE email = v_email LIMIT 1;
    
    -- If user does not exist, create a ghost user
    IF v_user_record.id IS NULL THEN
      v_user_record.id := uuid_generate_v4();
      
      INSERT INTO auth.users (
        id, 
        instance_id, 
        aud, 
        role, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        created_at, 
        updated_at
      ) VALUES (
        v_user_record.id, 
        '00000000-0000-0000-0000-000000000000', 
        'authenticated', 
        'authenticated', 
        v_email, 
        crypt(encode(gen_random_bytes(16), 'hex'), gen_salt('bf')), -- secure random password
        now(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', split_part(v_email, '@', 1)),
        now(), 
        now()
      );
      
      -- Insert into group_members immediately for ghost users
      INSERT INTO public.group_members (group_id, user_id, role)
      VALUES (p_group_id, v_user_record.id, 'member')
      ON CONFLICT (group_id, user_id) DO NOTHING;
      
    ELSE
      -- User exists.
      -- If they are a true ghost (never logged in), add them directly
      IF v_user_record.last_sign_in_at IS NULL THEN
        INSERT INTO public.group_members (group_id, user_id, role)
        VALUES (p_group_id, v_user_record.id, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING;
      ELSE
        -- Active user: Send a join request
        -- Skip if they are already in the group
        IF NOT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = v_user_record.id) THEN
          INSERT INTO public.group_requests (group_id, invited_by, user_id)
          VALUES (p_group_id, auth.uid(), v_user_record.id)
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
    
  END LOOP;
END;
$$;
