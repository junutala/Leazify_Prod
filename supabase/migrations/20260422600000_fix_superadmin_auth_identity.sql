-- ============================================================
-- FIX: Add missing auth.identities record for superadmin
-- 
-- Supabase requires a row in auth.identities for email/password
-- login to work. The previous migration only inserted into
-- auth.users but missed auth.identities, causing "Invalid login
-- credentials" errors.
-- ============================================================

DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- Get the superadmin user id
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'junutala@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    -- User doesn't exist at all — create both auth.users and auth.identities
    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_user_meta_data, raw_app_meta_data,
      is_sso_user, is_anonymous,
      confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at,
      email_change_token_new, email_change, email_change_sent_at,
      email_change_token_current, email_change_confirm_status,
      reauthentication_token, reauthentication_sent_at,
      phone, phone_change, phone_change_token, phone_change_sent_at
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'junutala@gmail.com',
      crypt('Arun@2026', gen_salt('bf', 10)),
      now(), now(), now(),
      jsonb_build_object('full_name', 'Super Admin', 'role', 'admin'),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
      false, false,
      '', null, '', null, '', '', null, '', 0, '', null,
      null, '', '', null
    );

    RAISE NOTICE 'Created new superadmin auth user: %', v_uid;
  ELSE
    -- User exists — reset password to ensure it is correct
    UPDATE auth.users
    SET
      encrypted_password = crypt('Arun@2026', gen_salt('bf', 10)),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_uid;

    RAISE NOTICE 'Reset password for existing superadmin user: %', v_uid;
  END IF;

  -- Insert auth.identities record if missing (required for email/password login)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_uid,
    v_uid,
    'junutala@gmail.com',
    jsonb_build_object(
      'sub', v_uid::TEXT,
      'email', 'junutala@gmail.com',
      'email_verified', true,
      'provider', 'email'
    ),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
    SET
      identity_data = jsonb_build_object(
        'sub', v_uid::TEXT,
        'email', 'junutala@gmail.com',
        'email_verified', true,
        'provider', 'email'
      ),
      updated_at = now();

  RAISE NOTICE 'auth.identities record ensured for junutala@gmail.com';

  -- Ensure user_profiles row exists and is marked superadmin
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active, is_superadmin)
  VALUES (v_uid, 'junutala@gmail.com', 'Super Admin', 'admin', true, true)
  ON CONFLICT (id) DO UPDATE
    SET
      is_superadmin = true,
      role = 'admin',
      is_active = true,
      email_confirmed_at = now(),
      updated_at = now();

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Fix superadmin identity failed: %', SQLERRM;
END $$;
