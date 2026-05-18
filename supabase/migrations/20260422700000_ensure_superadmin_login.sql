-- ============================================================
-- ENSURE SUPERADMIN CAN LOGIN
-- 
-- This migration is idempotent and ensures junutala@gmail.com
-- can log in with password Arun@2026.
-- 
-- Key fixes:
-- 1. Ensures auth.users row exists with correct password hash
-- 2. Ensures auth.identities row exists (required for email login)
-- 3. Ensures email is confirmed
-- 4. Uses ON CONFLICT to handle all cases safely
-- ============================================================

DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- --------------------------------------------------------
  -- Step 1: Get or create the auth.users record
  -- --------------------------------------------------------
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'junutala@gmail.com'
  LIMIT 1;

  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data,
      raw_app_meta_data,
      is_sso_user,
      is_anonymous,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      email_change_confirm_status,
      reauthentication_token,
      phone,
      phone_change,
      phone_change_token
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'junutala@gmail.com',
      crypt('Arun@2026', gen_salt('bf', 10)),
      now(),
      now(),
      now(),
      '{"full_name": "Super Admin", "role": "admin"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false,
      false,
      '',
      '',
      '',
      '',
      '',
      0,
      '',
      null,
      '',
      ''
    );

    RAISE NOTICE 'Created new auth user for junutala@gmail.com with id: %', v_uid;
  ELSE
    -- User exists — force-reset password and confirm email
    UPDATE auth.users
    SET
      encrypted_password = crypt('Arun@2026', gen_salt('bf', 10)),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_token = '',
      recovery_token = '',
      updated_at = now(),
      raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb
    WHERE id = v_uid;

    RAISE NOTICE 'Updated existing auth user for junutala@gmail.com: %', v_uid;
  END IF;

  -- --------------------------------------------------------
  -- Step 2: Ensure auth.identities record exists
  -- Supabase REQUIRES this for email/password login
  -- --------------------------------------------------------
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
      'sub',            v_uid::TEXT,
      'email',          'junutala@gmail.com',
      'email_verified', true,
      'provider',       'email'
    ),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
    SET
      user_id       = v_uid,
      identity_data = jsonb_build_object(
        'sub',            v_uid::TEXT,
        'email',          'junutala@gmail.com',
        'email_verified', true,
        'provider',       'email'
      ),
      updated_at    = now();

  RAISE NOTICE 'auth.identities ensured for junutala@gmail.com';

  -- --------------------------------------------------------
  -- Step 3: Ensure user_profiles row exists and is superadmin
  -- --------------------------------------------------------
  INSERT INTO public.user_profiles (
    id, email, full_name, role, is_active, is_superadmin
  ) VALUES (
    v_uid, 'junutala@gmail.com', 'Super Admin', 'admin', true, true
  )
  ON CONFLICT (id) DO UPDATE
    SET
      is_superadmin = true,
      role          = 'admin',
      is_active     = true,
      updated_at    = now();

  RAISE NOTICE 'user_profiles ensured for junutala@gmail.com';

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'ensure_superadmin_login failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;
