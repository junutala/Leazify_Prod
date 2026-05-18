-- ============================================================
-- FIX ALL SEEDED USERS AUTH
--
-- Root cause: auth.identities rows were never created for the
-- seeded users (admin, manager, tenant, provider). Supabase
-- REQUIRES an auth.identities row for email/password login.
--
-- This migration idempotently:
--   1. Resets passwords to match the seed data
--   2. Confirms email for all seeded users
--   3. Upserts auth.identities rows
--   4. Ensures user_profiles rows exist with correct data
-- ============================================================

DO $$
DECLARE
  v_admin_id    UUID;
  v_manager_id  UUID;
  v_tenant_id   UUID;
  v_provider_id UUID;
  v_finance_id  UUID;
BEGIN

  -- --------------------------------------------------------
  -- Helper: fix a single user's auth record + identity
  -- --------------------------------------------------------

  -- ADMIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@propflow.io' LIMIT 1;
  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
      is_sso_user, is_anonymous, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      email_change_confirm_status, reauthentication_token, phone, phone_change, phone_change_token
    ) VALUES (
      v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'admin@propflow.io', crypt('Admin@1234', gen_salt('bf', 10)), now(), now(), now(),
      '{"full_name": "Alex Rahman", "role": "admin"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false, false, '', '', '', '', '', 0, '', null, '', ''
    );
    RAISE NOTICE 'Created auth.users for admin@propflow.io: %', v_admin_id;
  ELSE
    UPDATE auth.users SET
      encrypted_password  = crypt('Admin@1234', gen_salt('bf', 10)),
      email_confirmed_at  = COALESCE(email_confirmed_at, now()),
      confirmation_token  = '',
      recovery_token      = '',
      updated_at          = now(),
      raw_app_meta_data   = '{"provider": "email", "providers": ["email"]}'::jsonb,
      raw_user_meta_data  = COALESCE(raw_user_meta_data, '{"full_name": "Alex Rahman", "role": "admin"}'::jsonb)
    WHERE id = v_admin_id;
    RAISE NOTICE 'Updated auth.users for admin@propflow.io: %', v_admin_id;
  END IF;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_admin_id, v_admin_id, 'admin@propflow.io',
    jsonb_build_object('sub', v_admin_id::TEXT, 'email', 'admin@propflow.io', 'email_verified', true, 'provider', 'email'),
    'email', now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id       = v_admin_id,
    identity_data = jsonb_build_object('sub', v_admin_id::TEXT, 'email', 'admin@propflow.io', 'email_verified', true, 'provider', 'email'),
    updated_at    = now();

  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (v_admin_id, 'admin@propflow.io', 'Alex Rahman', 'admin', true)
  ON CONFLICT (id) DO UPDATE SET
    email      = 'admin@propflow.io',
    full_name  = COALESCE(NULLIF(user_profiles.full_name, ''), 'Alex Rahman'),
    role       = COALESCE(user_profiles.role, 'admin'),
    is_active  = true,
    updated_at = now();

  -- MANAGER
  SELECT id INTO v_manager_id FROM auth.users WHERE email = 'manager@propflow.io' LIMIT 1;
  IF v_manager_id IS NULL THEN
    v_manager_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
      is_sso_user, is_anonymous, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      email_change_confirm_status, reauthentication_token, phone, phone_change, phone_change_token
    ) VALUES (
      v_manager_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'manager@propflow.io', crypt('Manager@1234', gen_salt('bf', 10)), now(), now(), now(),
      '{"full_name": "Sara Al Nouri", "role": "manager"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false, false, '', '', '', '', '', 0, '', null, '', ''
    );
    RAISE NOTICE 'Created auth.users for manager@propflow.io: %', v_manager_id;
  ELSE
    UPDATE auth.users SET
      encrypted_password  = crypt('Manager@1234', gen_salt('bf', 10)),
      email_confirmed_at  = COALESCE(email_confirmed_at, now()),
      confirmation_token  = '',
      recovery_token      = '',
      updated_at          = now(),
      raw_app_meta_data   = '{"provider": "email", "providers": ["email"]}'::jsonb,
      raw_user_meta_data  = COALESCE(raw_user_meta_data, '{"full_name": "Sara Al Nouri", "role": "manager"}'::jsonb)
    WHERE id = v_manager_id;
    RAISE NOTICE 'Updated auth.users for manager@propflow.io: %', v_manager_id;
  END IF;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_manager_id, v_manager_id, 'manager@propflow.io',
    jsonb_build_object('sub', v_manager_id::TEXT, 'email', 'manager@propflow.io', 'email_verified', true, 'provider', 'email'),
    'email', now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id       = v_manager_id,
    identity_data = jsonb_build_object('sub', v_manager_id::TEXT, 'email', 'manager@propflow.io', 'email_verified', true, 'provider', 'email'),
    updated_at    = now();

  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (v_manager_id, 'manager@propflow.io', 'Sara Al Nouri', 'manager', true)
  ON CONFLICT (id) DO UPDATE SET
    email      = 'manager@propflow.io',
    full_name  = COALESCE(NULLIF(user_profiles.full_name, ''), 'Sara Al Nouri'),
    role       = COALESCE(user_profiles.role, 'manager'),
    is_active  = true,
    updated_at = now();

  -- TENANT
  SELECT id INTO v_tenant_id FROM auth.users WHERE email = 'tenant@propflow.io' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    v_tenant_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
      is_sso_user, is_anonymous, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      email_change_confirm_status, reauthentication_token, phone, phone_change, phone_change_token
    ) VALUES (
      v_tenant_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'tenant@propflow.io', crypt('Tenant@1234', gen_salt('bf', 10)), now(), now(), now(),
      '{"full_name": "Nexus Tech LLC", "role": "tenant"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false, false, '', '', '', '', '', 0, '', null, '', ''
    );
    RAISE NOTICE 'Created auth.users for tenant@propflow.io: %', v_tenant_id;
  ELSE
    UPDATE auth.users SET
      encrypted_password  = crypt('Tenant@1234', gen_salt('bf', 10)),
      email_confirmed_at  = COALESCE(email_confirmed_at, now()),
      confirmation_token  = '',
      recovery_token      = '',
      updated_at          = now(),
      raw_app_meta_data   = '{"provider": "email", "providers": ["email"]}'::jsonb,
      raw_user_meta_data  = COALESCE(raw_user_meta_data, '{"full_name": "Nexus Tech LLC", "role": "tenant"}'::jsonb)
    WHERE id = v_tenant_id;
    RAISE NOTICE 'Updated auth.users for tenant@propflow.io: %', v_tenant_id;
  END IF;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_tenant_id, v_tenant_id, 'tenant@propflow.io',
    jsonb_build_object('sub', v_tenant_id::TEXT, 'email', 'tenant@propflow.io', 'email_verified', true, 'provider', 'email'),
    'email', now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id       = v_tenant_id,
    identity_data = jsonb_build_object('sub', v_tenant_id::TEXT, 'email', 'tenant@propflow.io', 'email_verified', true, 'provider', 'email'),
    updated_at    = now();

  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (v_tenant_id, 'tenant@propflow.io', 'Nexus Tech LLC', 'tenant', true)
  ON CONFLICT (id) DO UPDATE SET
    email      = 'tenant@propflow.io',
    full_name  = COALESCE(NULLIF(user_profiles.full_name, ''), 'Nexus Tech LLC'),
    role       = COALESCE(user_profiles.role, 'tenant'),
    is_active  = true,
    updated_at = now();

  -- SERVICE PROVIDER
  SELECT id INTO v_provider_id FROM auth.users WHERE email = 'provider@propflow.io' LIMIT 1;
  IF v_provider_id IS NULL THEN
    v_provider_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
      is_sso_user, is_anonymous, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      email_change_confirm_status, reauthentication_token, phone, phone_change, phone_change_token
    ) VALUES (
      v_provider_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'provider@propflow.io', crypt('Provider@1234', gen_salt('bf', 10)), now(), now(), now(),
      '{"full_name": "Al Futtaim Electrics LLC", "role": "viewer"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false, false, '', '', '', '', '', 0, '', null, '', ''
    );
    RAISE NOTICE 'Created auth.users for provider@propflow.io: %', v_provider_id;
  ELSE
    UPDATE auth.users SET
      encrypted_password  = crypt('Provider@1234', gen_salt('bf', 10)),
      email_confirmed_at  = COALESCE(email_confirmed_at, now()),
      confirmation_token  = '',
      recovery_token      = '',
      updated_at          = now(),
      raw_app_meta_data   = '{"provider": "email", "providers": ["email"]}'::jsonb,
      raw_user_meta_data  = COALESCE(raw_user_meta_data, '{"full_name": "Al Futtaim Electrics LLC", "role": "viewer"}'::jsonb)
    WHERE id = v_provider_id;
    RAISE NOTICE 'Updated auth.users for provider@propflow.io: %', v_provider_id;
  END IF;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_provider_id, v_provider_id, 'provider@propflow.io',
    jsonb_build_object('sub', v_provider_id::TEXT, 'email', 'provider@propflow.io', 'email_verified', true, 'provider', 'email'),
    'email', now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id       = v_provider_id,
    identity_data = jsonb_build_object('sub', v_provider_id::TEXT, 'email', 'provider@propflow.io', 'email_verified', true, 'provider', 'email'),
    updated_at    = now();

  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (v_provider_id, 'provider@propflow.io', 'Al Futtaim Electrics LLC', 'viewer', true)
  ON CONFLICT (id) DO UPDATE SET
    email      = 'provider@propflow.io',
    full_name  = COALESCE(NULLIF(user_profiles.full_name, ''), 'Al Futtaim Electrics LLC'),
    role       = COALESCE(user_profiles.role, 'viewer'),
    is_active  = true,
    updated_at = now();

  -- FINANCE (extra demo account)
  SELECT id INTO v_finance_id FROM auth.users WHERE email = 'finance@propflow.io' LIMIT 1;
  IF v_finance_id IS NULL THEN
    v_finance_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
      is_sso_user, is_anonymous, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      email_change_confirm_status, reauthentication_token, phone, phone_change, phone_change_token
    ) VALUES (
      v_finance_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'finance@propflow.io', crypt('Finance@1234', gen_salt('bf', 10)), now(), now(), now(),
      '{"full_name": "Finance User", "role": "operations"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      false, false, '', '', '', '', '', 0, '', null, '', ''
    );
    RAISE NOTICE 'Created auth.users for finance@propflow.io: %', v_finance_id;
  ELSE
    UPDATE auth.users SET
      encrypted_password  = crypt('Finance@1234', gen_salt('bf', 10)),
      email_confirmed_at  = COALESCE(email_confirmed_at, now()),
      confirmation_token  = '',
      recovery_token      = '',
      updated_at          = now(),
      raw_app_meta_data   = '{"provider": "email", "providers": ["email"]}'::jsonb
    WHERE id = v_finance_id;
    RAISE NOTICE 'Updated auth.users for finance@propflow.io: %', v_finance_id;
  END IF;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_finance_id, v_finance_id, 'finance@propflow.io',
    jsonb_build_object('sub', v_finance_id::TEXT, 'email', 'finance@propflow.io', 'email_verified', true, 'provider', 'email'),
    'email', now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id       = v_finance_id,
    identity_data = jsonb_build_object('sub', v_finance_id::TEXT, 'email', 'finance@propflow.io', 'email_verified', true, 'provider', 'email'),
    updated_at    = now();

  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (v_finance_id, 'finance@propflow.io', 'Finance User', 'operations', true)
  ON CONFLICT (id) DO UPDATE SET
    email      = 'finance@propflow.io',
    full_name  = COALESCE(NULLIF(user_profiles.full_name, ''), 'Finance User'),
    is_active  = true,
    updated_at = now();

  RAISE NOTICE 'All seeded user auth records fixed successfully.';

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'fix_all_seeded_users_auth failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END $$;
