-- Create landlord demo user for portal access
-- Email: landlord@propflow.io | Password: Landlord@1234

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'landlord@propflow.io';

  IF v_user_id IS NULL THEN
    -- Create auth user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'landlord@propflow.io',
      crypt('Landlord@1234', gen_salt('bf')),
      now(),
      '{"full_name": "Demo Landlord", "role": "landlord"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_user_id;

    -- Create identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'landlord@propflow.io'),
      'email',
      'landlord@propflow.io',
      now(),
      now(),
      now()
    );
  END IF;

  -- Upsert user_profile with landlord role
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
  VALUES (v_user_id, 'landlord@propflow.io', 'Demo Landlord', 'landlord', true)
  ON CONFLICT (id) DO UPDATE
    SET role = 'landlord',
        full_name = 'Demo Landlord',
        is_active = true;

END $$;
