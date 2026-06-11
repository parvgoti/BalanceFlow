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
  v_user_id UUID;
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
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;
    
    -- If user does not exist, create a ghost user
    IF v_user_id IS NULL THEN
      v_user_id := uuid_generate_v4();
      
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
        v_user_id, 
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
      
      -- The trigger on auth.users will automatically create the public.profiles record
    END IF;

    -- Insert into group_members
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (p_group_id, v_user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
  END LOOP;
END;
$$;
