-- ============================================================
-- PropFlow Clean Seed Data Migration
-- Wipes old seeded data and inserts fresh, consistent test data
-- for end-to-end manual testing across all modules.
--
-- Test Credentials:
--   Admin:    admin@propflow.io     / Admin@1234
--   Manager:  manager@propflow.io  / Manager@1234
--   Tenant:   tenant@propflow.io   / Tenant@1234
--   Provider: provider@propflow.io / Provider@1234
-- ============================================================

-- ============================================================
-- STEP 1: CLEAN OLD SEEDED DATA (children first, parents last)
-- ============================================================
DO $$
BEGIN
  -- Junction / child tables
  DELETE FROM public.work_order_service_requests WHERE true;
  DELETE FROM public.co_tenants WHERE true;
  DELETE FROM public.provider_project_assignments WHERE true;
  DELETE FROM public.estate_assignments WHERE true;
  DELETE FROM public.person_contacts WHERE true;

  -- Operational tables
  DELETE FROM public.turnover_rent WHERE true;
  DELETE FROM public.audit_logs WHERE true;
  DELETE FROM public.bulk_upload_logs WHERE true;
  DELETE FROM public.notification_settings WHERE true;
  DELETE FROM public.vat_config WHERE true;
  DELETE FROM public.work_orders WHERE true;
  DELETE FROM public.maintenance_requests WHERE true;
  DELETE FROM public.service_requests WHERE true;
  DELETE FROM public.invoices WHERE true;
  DELETE FROM public.payments WHERE true;
  DELETE FROM public.leases WHERE true;
  DELETE FROM public.lease_renewals WHERE true;

  -- Master data
  DELETE FROM public.units WHERE true;
  DELETE FROM public.floors WHERE true;
  DELETE FROM public.buildings WHERE true;
  DELETE FROM public.properties WHERE true;
  DELETE FROM public.projects WHERE true;
  DELETE FROM public.tenants WHERE true;
  DELETE FROM public.persons WHERE true;
  DELETE FROM public.service_providers WHERE true;

  -- Auth users (seeded test accounts only — identified by email domain)
  DELETE FROM public.user_profiles
  WHERE email IN (
    'admin@propflow.io',
    'manager@propflow.io',
    'tenant@propflow.io',
    'provider@propflow.io'
  );
  DELETE FROM auth.users
  WHERE email IN (
    'admin@propflow.io',
    'manager@propflow.io',
    'tenant@propflow.io',
    'provider@propflow.io'
  );

  RAISE NOTICE 'Old seed data cleaned successfully.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup encountered an error (some tables may not exist yet): %', SQLERRM;
END $$;


-- ============================================================
-- STEP 2: INSERT FRESH SEED DATA
-- ============================================================
DO $$
DECLARE
  -- Auth user IDs
  admin_auth_id    UUID := gen_random_uuid();
  manager_auth_id  UUID := gen_random_uuid();
  tenant_auth_id   UUID := gen_random_uuid();
  provider_auth_id UUID := gen_random_uuid();

  -- Project / Building / Floor IDs
  proj1_id  UUID := gen_random_uuid();
  proj2_id  UUID := gen_random_uuid();
  bldg1_id  UUID := gen_random_uuid();
  bldg2_id  UUID := gen_random_uuid();
  bldg3_id  UUID := gen_random_uuid();
  floor1_id UUID := gen_random_uuid();
  floor2_id UUID := gen_random_uuid();
  floor3_id UUID := gen_random_uuid();
  floor4_id UUID := gen_random_uuid();
  floor5_id UUID := gen_random_uuid();

  -- Property IDs
  prop1_id UUID := gen_random_uuid();
  prop2_id UUID := gen_random_uuid();

  -- Unit IDs
  unit1_id UUID := gen_random_uuid();
  unit2_id UUID := gen_random_uuid();
  unit3_id UUID := gen_random_uuid();
  unit4_id UUID := gen_random_uuid();
  unit5_id UUID := gen_random_uuid();
  unit6_id UUID := gen_random_uuid();

  -- Person IDs
  person1_id UUID := gen_random_uuid();
  person2_id UUID := gen_random_uuid();
  person3_id UUID := gen_random_uuid();
  person4_id UUID := gen_random_uuid();

  -- Tenant IDs
  tenant1_id UUID := gen_random_uuid();
  tenant2_id UUID := gen_random_uuid();
  tenant3_id UUID := gen_random_uuid();
  tenant4_id UUID := gen_random_uuid();

  -- Lease IDs
  lease1_id UUID := gen_random_uuid();
  lease2_id UUID := gen_random_uuid();
  lease3_id UUID := gen_random_uuid();
  lease4_id UUID := gen_random_uuid();

  -- Invoice IDs
  inv1_id  UUID := gen_random_uuid();
  inv2_id  UUID := gen_random_uuid();
  inv3_id  UUID := gen_random_uuid();
  inv4_id  UUID := gen_random_uuid();
  inv5_id  UUID := gen_random_uuid();
  inv6_id  UUID := gen_random_uuid();
  inv7_id  UUID := gen_random_uuid();
  inv8_id  UUID := gen_random_uuid();
  inv9_id  UUID := gen_random_uuid();
  inv10_id UUID := gen_random_uuid();

  -- Service Provider IDs
  sp1_id UUID := gen_random_uuid();
  sp2_id UUID := gen_random_uuid();
  sp3_id UUID := gen_random_uuid();

  -- Service Request IDs
  sr1_id UUID := gen_random_uuid();
  sr2_id UUID := gen_random_uuid();
  sr3_id UUID := gen_random_uuid();
  sr4_id UUID := gen_random_uuid();
  sr5_id UUID := gen_random_uuid();

  -- Maintenance Request IDs
  mr1_id UUID := gen_random_uuid();
  mr2_id UUID := gen_random_uuid();
  mr3_id UUID := gen_random_uuid();
  mr4_id UUID := gen_random_uuid();

  -- Work Order IDs
  wo1_id UUID := gen_random_uuid();
  wo2_id UUID := gen_random_uuid();
  wo3_id UUID := gen_random_uuid();
  wo4_id UUID := gen_random_uuid();

BEGIN

  -- ============================================================
  -- 1. AUTH USERS
  -- ============================================================
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    -- Admin
    (admin_auth_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@propflow.io', crypt('Admin@1234', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Alex Rahman', 'role', 'admin'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    -- Manager
    (manager_auth_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'manager@propflow.io', crypt('Manager@1234', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Sara Al Nouri', 'role', 'manager'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    -- Tenant
    (tenant_auth_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'tenant@propflow.io', crypt('Tenant@1234', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Nexus Tech LLC', 'role', 'tenant'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    -- Service Provider
    (provider_auth_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'provider@propflow.io', crypt('Provider@1234', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Al Futtaim Electrics LLC', 'role', 'viewer'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 2. USER PROFILES (upsert in case trigger already fired)
  -- ============================================================
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES
    (admin_auth_id,    'admin@propflow.io',    'Alex Rahman',             'admin'),
    (manager_auth_id,  'manager@propflow.io',  'Sara Al Nouri',           'manager'),
    (tenant_auth_id,   'tenant@propflow.io',   'Nexus Tech LLC',          'tenant'),
    (provider_auth_id, 'provider@propflow.io', 'Al Futtaim Electrics LLC','viewer')
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role      = EXCLUDED.role;

  -- ============================================================
  -- 3. PROJECTS
  -- ============================================================
  INSERT INTO public.projects (id, name, address, city, country, usage_type, number_of_buildings, vat_registered, vat_number, created_by)
  VALUES
    (proj1_id, 'Marina Business Park',   'Plot 12, Dubai Marina',          'Dubai',      'United Arab Emirates', 'office'::public.usage_type, 2, true,  'VAT-100234567',  admin_auth_id),
    (proj2_id, 'Downtown Retail Centre', 'Sheikh Zayed Road, Downtown',    'Dubai',      'United Arab Emirates', 'retail'::public.usage_type, 1, true,  'VAT-100987654',  admin_auth_id)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 4. BUILDINGS
  -- ============================================================
  INSERT INTO public.buildings (id, project_id, name, address, number_of_floors, usage_type)
  VALUES
    (bldg1_id, proj1_id, 'Tower A', 'Plot 12A, Dubai Marina', 10, 'office'::public.usage_type),
    (bldg2_id, proj1_id, 'Tower B', 'Plot 12B, Dubai Marina', 8,  'office'::public.usage_type),
    (bldg3_id, proj2_id, 'Retail Block 1', 'Sheikh Zayed Road, Ground Level', 3, 'retail'::public.usage_type)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 5. FLOORS
  -- ============================================================
  INSERT INTO public.floors (id, building_id, name, number_of_units, usage_type)
  VALUES
    (floor1_id, bldg1_id, 'Ground Floor',  4, 'office'::public.usage_type),
    (floor2_id, bldg1_id, 'Level 2',       4, 'office'::public.usage_type),
    (floor3_id, bldg2_id, 'Ground Floor',  3, 'office'::public.usage_type),
    (floor4_id, bldg3_id, 'Ground Floor',  4, 'retail'::public.usage_type),
    (floor5_id, bldg3_id, 'Level 1',       3, 'retail'::public.usage_type)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 6. PROPERTIES
  -- ============================================================
  INSERT INTO public.properties (id, project_id, name, address, property_type, total_floors, owner_id)
  VALUES
    (prop1_id, proj1_id, 'Marina Tower A', 'Plot 12A, Dubai Marina, Dubai', 'office'::public.property_type, 10, admin_auth_id),
    (prop2_id, proj2_id, 'Downtown Retail Centre', 'Sheikh Zayed Road, Downtown Dubai', 'retail'::public.property_type, 3, admin_auth_id)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 7. UNITS
  -- ============================================================
  INSERT INTO public.units (id, property_id, unit_number, floor_number, unit_type, area_sqft, status, monthly_rent, floor_id, usage_type)
  VALUES
    (unit1_id, prop1_id, 'A-G01', 0, 'office'::public.property_type, 1200, 'occupied'::public.unit_status,    18000, floor1_id, 'office'::public.usage_type),
    (unit2_id, prop1_id, 'A-G02', 0, 'office'::public.property_type, 950,  'occupied'::public.unit_status,    14500, floor1_id, 'office'::public.usage_type),
    (unit3_id, prop1_id, 'A-201', 2, 'office'::public.property_type, 1500, 'vacant'::public.unit_status,      22000, floor2_id, 'office'::public.usage_type),
    (unit4_id, prop1_id, 'A-202', 2, 'office'::public.property_type, 800,  'maintenance'::public.unit_status, 12000, floor2_id, 'office'::public.usage_type),
    (unit5_id, prop2_id, 'R-001', 0, 'retail'::public.property_type, 1100, 'occupied'::public.unit_status,    32000, floor4_id, 'retail'::public.usage_type),
    (unit6_id, prop2_id, 'R-002', 0, 'retail'::public.property_type, 750,  'occupied'::public.unit_status,    22000, floor4_id, 'retail'::public.usage_type)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 8. PERSONS (lessees / owners)
  -- ============================================================
  INSERT INTO public.persons (id, person_type, name, email, mobile, national_id, contact_address)
  VALUES
    (person1_id, 'company'::public.person_type,    'Nexus Tech LLC',         'accounts@nexustech.ae',    '+971501234567', 'TL-2021-00123', 'Office 501, Business Bay, Dubai'),
    (person2_id, 'individual'::public.person_type, 'Sarah Al Mansouri',      'sarah.mansouri@email.com', '+971502345678', 'UAE-ID-88765',  'Villa 14, Jumeirah 2, Dubai'),
    (person3_id, 'company'::public.person_type,    'Gulf Retail Partners',   'finance@gulfretail.ae',    '+971503456789', 'TL-2019-00456', 'Floor 3, DIFC Gate Building, Dubai'),
    (person4_id, 'individual'::public.person_type, 'Mohammed Al Rashidi',    'mo.rashidi@email.com',     '+971504567890', 'UAE-ID-77321',  'Apt 22B, JLT Cluster Q, Dubai')
  ON CONFLICT (id) DO NOTHING;

  -- Link tenant user_profile to person1 (Nexus Tech)
  UPDATE public.user_profiles
  SET person_id = person1_id
  WHERE id = tenant_auth_id;

  -- ============================================================
  -- 9. TENANTS
  -- ============================================================
  INSERT INTO public.tenants (id, full_name, email, phone, nationality, id_type, id_number)
  VALUES
    (tenant1_id, 'Nexus Tech LLC',       'accounts@nexustech.ae',    '+971501234567', 'UAE',     'trade_licence', 'TL-2021-00123'),
    (tenant2_id, 'Sarah Al Mansouri',    'sarah.mansouri@email.com', '+971502345678', 'Emirati', 'national_id',   'UAE-ID-88765'),
    (tenant3_id, 'Gulf Retail Partners', 'finance@gulfretail.ae',    '+971503456789', 'UAE',     'trade_licence', 'TL-2019-00456'),
    (tenant4_id, 'Mohammed Al Rashidi',  'mo.rashidi@email.com',     '+971504567890', 'Emirati', 'national_id',   'UAE-ID-77321')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 10. LEASES
  -- Lease 1: Active, long-term (Nexus Tech, unit A-G01)
  -- Lease 2: Active, expiring soon in 3 months (Sarah, unit A-G02)
  -- Lease 3: Active, retail with turnover rent (Gulf Retail, unit R-001)
  -- Lease 4: Expired (Mohammed, unit R-002)
  -- ============================================================
  INSERT INTO public.leases (
    id, unit_id, lessee_person_id, start_date, end_date,
    rent_amount, security_deposit, payment_terms, status,
    lease_number, annual_increment_pct, turnover_rent_pct,
    turnover_rent_payment_term, created_by
  )
  VALUES
    (lease1_id, unit1_id, person1_id, '2024-01-01', '2026-12-31', 18000, 36000,
     '30_days'::public.payment_terms, 'active'::public.lease_status,
     'LES-2024-001', 5, 0, 'monthly', admin_auth_id),

    (lease2_id, unit2_id, person2_id, '2024-07-01', '2025-07-20', 14500, 29000,
     'immediate'::public.payment_terms, 'active'::public.lease_status,
     'LES-2024-002', 3, 0, 'monthly', manager_auth_id),

    (lease3_id, unit5_id, person3_id, '2023-07-01', '2025-06-30', 32000, 64000,
     '30_days'::public.payment_terms, 'active'::public.lease_status,
     'LES-2023-003', 4, 8, 'monthly', admin_auth_id),

    (lease4_id, unit6_id, person4_id, '2022-01-01', '2024-12-31', 22000, 44000,
     '15_days'::public.payment_terms, 'expired'::public.lease_status,
     'LES-2022-004', 0, 0, 'monthly', manager_auth_id)
  ON CONFLICT (id) DO NOTHING;

  -- Co-tenants (primary lessee links)
  INSERT INTO public.co_tenants (id, lease_id, tenant_id, share_percentage, is_primary)
  VALUES
    (gen_random_uuid(), lease1_id, tenant1_id, 100, true),
    (gen_random_uuid(), lease2_id, tenant2_id, 100, true),
    (gen_random_uuid(), lease3_id, tenant3_id, 100, true),
    (gen_random_uuid(), lease4_id, tenant4_id, 100, true)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 11. VAT CONFIG (per project)
  -- ============================================================
  INSERT INTO public.vat_config (id, project_id, vat_number, rent_vat_pct, security_deposit_vat_pct, turnover_rent_vat_pct, amc_vat_pct, misc_vat_pct)
  VALUES
    (gen_random_uuid(), proj1_id, 'VAT-100234567', 5, 0, 5, 5, 5),
    (gen_random_uuid(), proj2_id, 'VAT-100987654', 5, 0, 5, 5, 5)
  ON CONFLICT (project_id) DO NOTHING;

  -- ============================================================
  -- 12. INVOICES
  -- Mix of statuses: paid, overdue, sent, draft, approved, pending
  -- ============================================================
  INSERT INTO public.invoices (
    id, lease_id, tenant_id, unit_id,
    invoice_number, invoice_type, invoice_type_ext,
    amount, tax_amount, vat_pct, total_amount,
    payment_terms, due_date, status,
    invoice_period_start, invoice_period_end,
    approval_status, invoice_source, created_by
  )
  VALUES
    -- Lease 1 (Nexus Tech / A-G01): Security deposit — paid & approved
    (inv1_id,  lease1_id, tenant1_id, unit1_id, 'INV-2024-0001',
     'security_deposit'::public.invoice_type, 'security_deposit'::public.invoice_type_ext,
     36000, 0, 0, 36000, 'immediate'::public.payment_terms,
     '2024-01-10', 'paid'::public.invoice_status,
     '2024-01-01', '2024-01-01', 'approved', 'manual', admin_auth_id),

    -- Lease 1: Feb 2025 rent — paid & approved
    (inv2_id,  lease1_id, tenant1_id, unit1_id, 'INV-2025-0001',
     'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,
     18000, 900, 5, 18900, '30_days'::public.payment_terms,
     '2025-02-28', 'paid'::public.invoice_status,
     '2025-02-01', '2025-02-28', 'approved', 'manual', admin_auth_id),

    -- Lease 1: Mar 2025 rent — paid & approved
    (inv3_id,  lease1_id, tenant1_id, unit1_id, 'INV-2025-0002',
     'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,
     18000, 900, 5, 18900, '30_days'::public.payment_terms,
     '2025-03-31', 'paid'::public.invoice_status,
     '2025-03-01', '2025-03-31', 'approved', 'manual', admin_auth_id),

    -- Lease 1: Apr 2025 rent — sent, pending approval
    (inv4_id,  lease1_id, tenant1_id, unit1_id, 'INV-2025-0003',
     'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,
     18000, 900, 5, 18900, '30_days'::public.payment_terms,
     '2025-04-30', 'sent'::public.invoice_status,
     '2025-04-01', '2025-04-30', 'pending', 'manual', admin_auth_id),

    -- Lease 2 (Sarah / A-G02): Mar 2025 rent — overdue, pending approval
    (inv5_id,  lease2_id, tenant2_id, unit2_id, 'INV-2025-0004',
     'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,
     14500, 725, 5, 15225, 'immediate'::public.payment_terms,
     '2025-03-15', 'overdue'::public.invoice_status,
     '2025-03-01', '2025-03-31', 'pending', 'manual', manager_auth_id),

    -- Lease 2: Apr 2025 rent — draft
    (inv6_id,  lease2_id, tenant2_id, unit2_id, 'INV-2025-0005',
     'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,
     14500, 725, 5, 15225, 'immediate'::public.payment_terms,
     '2025-04-30', 'draft'::public.invoice_status,
     '2025-04-01', '2025-04-30', 'pending', 'manual', manager_auth_id),

    -- Lease 3 (Gulf Retail / R-001): Security deposit — paid & approved
    (inv7_id,  lease3_id, tenant3_id, unit5_id, 'INV-2023-0001',
     'security_deposit'::public.invoice_type, 'security_deposit'::public.invoice_type_ext,
     64000, 0, 0, 64000, 'immediate'::public.payment_terms,
     '2023-07-10', 'paid'::public.invoice_status,
     '2023-07-01', '2023-07-01', 'approved', 'manual', admin_auth_id),

    -- Lease 3: Mar 2025 rent — paid & approved
    (inv8_id,  lease3_id, tenant3_id, unit5_id, 'INV-2025-0006',
     'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,
     32000, 1600, 5, 33600, '30_days'::public.payment_terms,
     '2025-03-31', 'paid'::public.invoice_status,
     '2025-03-01', '2025-03-31', 'approved', 'manual', admin_auth_id),

    -- Lease 3: Apr 2025 rent — sent, pending approval
    (inv9_id,  lease3_id, tenant3_id, unit5_id, 'INV-2025-0007',
     'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,
     32000, 1600, 5, 33600, '30_days'::public.payment_terms,
     '2025-04-30', 'sent'::public.invoice_status,
     '2025-04-01', '2025-04-30', 'pending', 'manual', admin_auth_id),

    -- Lease 4 (Mohammed / R-002): Final rent — overdue (expired lease)
    (inv10_id, lease4_id, tenant4_id, unit6_id, 'INV-2024-0010',
     'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,
     22000, 1100, 5, 23100, '15_days'::public.payment_terms,
     '2024-12-15', 'overdue'::public.invoice_status,
     '2024-12-01', '2024-12-31', 'pending', 'manual', manager_auth_id)
  ON CONFLICT (invoice_number) DO NOTHING;

  -- ============================================================
  -- 13. SERVICE PROVIDERS
  -- ============================================================
  INSERT INTO public.service_providers (id, person_type, name, trade_licence_no, skill_type, email, mobile, response_time_hours, is_active)
  VALUES
    (sp1_id, 'company'::public.person_type,    'Al Futtaim Electrics LLC', 'TL-ELEC-2020-001', 'electrical'::public.skill_type, 'provider@propflow.io',       '+97143001234',  4,  true),
    (sp2_id, 'company'::public.person_type,    'ProPlumb Services LLC',    'TL-PLMB-2019-007', 'plumbing'::public.skill_type,   'service@proplumb.ae',        '+97143005678',  8,  true),
    (sp3_id, 'individual'::public.person_type, 'Ahmed Hassan Painting',    NULL,               'painting'::public.skill_type,   'ahmed.hassan.paint@gmail.com','+971509876543', 24, true)
  ON CONFLICT (id) DO NOTHING;

  -- Link provider user_profile to sp1
  UPDATE public.user_profiles
  SET provider_id = sp1_id
  WHERE id = provider_auth_id;

  -- Assign providers to projects
  INSERT INTO public.provider_project_assignments (id, provider_id, project_id)
  VALUES
    (gen_random_uuid(), sp1_id, proj1_id),
    (gen_random_uuid(), sp1_id, proj2_id),
    (gen_random_uuid(), sp2_id, proj1_id),
    (gen_random_uuid(), sp3_id, proj2_id)
  ON CONFLICT (provider_id, project_id) DO NOTHING;

  -- ============================================================
  -- 14. SERVICE REQUESTS
  -- Covers: urgent, high, medium, low priorities; open, in_progress, completed statuses
  -- ============================================================
  INSERT INTO public.service_requests (
    id, unit_id, property_id, tenant_id, raised_by,
    title, description, category, priority, status,
    skill_type, provider_id, payer, is_common_area,
    charge_amount, charge_submitted
  )
  VALUES
    (sr1_id, unit1_id, prop1_id, tenant1_id, admin_auth_id,
     'AC unit not cooling — main office',
     'The split AC in unit A-G01 is not reaching the set temperature. Compressor noise audible. Needs urgent inspection.',
     'hvac', 'urgent'::public.service_request_priority, 'in_progress'::public.service_request_status,
     'electrical'::public.skill_type, sp1_id, 'landlord'::public.payer_type, false, 0, false),

    (sr2_id, unit2_id, prop1_id, tenant2_id, manager_auth_id,
     'Leaking tap in executive washroom',
     'Cold water tap in the executive washroom of unit A-G02 is dripping continuously. Wasting water.',
     'plumbing', 'medium'::public.service_request_priority, 'open'::public.service_request_status,
     'plumbing'::public.skill_type, sp2_id, 'tenant'::public.payer_type, false, 0, false),

    (sr3_id, unit5_id, prop2_id, tenant3_id, admin_auth_id,
     'Electrical socket sparking — checkout area',
     'Power socket near the checkout counter in R-001 is sparking when devices are plugged in. Safety hazard — needs immediate attention.',
     'electrical', 'urgent'::public.service_request_priority, 'open'::public.service_request_status,
     'electrical'::public.skill_type, sp1_id, 'landlord'::public.payer_type, false, 0, false),

    (sr4_id, unit1_id, prop1_id, tenant1_id, admin_auth_id,
     'Interior repaint before lease renewal',
     'Tenant Nexus Tech has requested a fresh coat of paint for the interior walls of A-G01 prior to lease renewal in Dec 2026.',
     'painting', 'low'::public.service_request_priority, 'completed'::public.service_request_status,
     'painting'::public.skill_type, sp3_id, 'tenant'::public.payer_type, false, 4800, true),

    (sr5_id, NULL, prop1_id, NULL, manager_auth_id,
     'Lobby ceiling lights not working',
     'Three ceiling lights in the main lobby of Tower A are out. Common area maintenance required before tenant complaints escalate.',
     'electrical', 'medium'::public.service_request_priority, 'open'::public.service_request_status,
     'electrical'::public.skill_type, sp1_id, 'landlord'::public.payer_type, true, 0, false)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 15. MAINTENANCE REQUESTS (common area / landlord-paid)
  -- ============================================================
  INSERT INTO public.maintenance_requests (
    id, project_id, building_id, floor_id, area_description,
    skill_type, provider_id, description, payer, status, raised_by,
    charge_amount, charge_submitted
  )
  VALUES
    (mr1_id, proj1_id, bldg1_id, floor1_id,
     'Ground floor corridor near lift lobby',
     'electrical'::public.skill_type, sp1_id,
     'Emergency lighting in the ground floor corridor has failed. Backup lights not activating during power cuts. Fire safety risk.',
     'landlord'::public.payer_type, 'open'::public.maintenance_status, admin_auth_id, 0, false),

    (mr2_id, proj1_id, bldg1_id, floor2_id,
     'Level 2 common washroom',
     'plumbing'::public.skill_type, sp2_id,
     'Blocked drain in the common washroom on Level 2. Water pooling on the floor. Needs immediate clearing.',
     'landlord'::public.payer_type, 'in_progress'::public.maintenance_status, manager_auth_id, 0, false),

    (mr3_id, proj2_id, bldg3_id, floor4_id,
     'Retail Block 1 — exterior facade',
     'painting'::public.skill_type, sp3_id,
     'Exterior paint on the facade of Retail Block 1 is peeling near the entrance. Requires sanding, priming, and repainting.',
     'landlord'::public.payer_type, 'completed'::public.maintenance_status, admin_auth_id, 6500, true),

    (mr4_id, proj1_id, bldg2_id, floor3_id,
     'Tower B — ground floor car park',
     'electrical'::public.skill_type, sp1_id,
     'Automatic barrier at the car park entrance is malfunctioning. Barrier arm not lifting after valid access card swipe.',
     'landlord'::public.payer_type, 'open'::public.maintenance_status, manager_auth_id, 0, false)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 16. WORK ORDERS
  -- ============================================================
  INSERT INTO public.work_orders (
    id, wo_number, project_id, building_id, floor_id,
    skill_type, provider_id, amount, payment_terms,
    other_instructions, payer, status, raised_by
  )
  VALUES
    (wo1_id, 'WO-2025-00001', proj1_id, bldg1_id, floor1_id,
     'electrical'::public.skill_type, sp1_id, 3500, 'immediate',
     'Replace all faulty emergency lighting units in ground floor corridor. Use LED replacements only. Work to be completed outside business hours.',
     'landlord'::public.payer_type, 'issued'::public.work_order_status, admin_auth_id),

    (wo2_id, 'WO-2025-00002', proj1_id, bldg1_id, floor2_id,
     'plumbing'::public.skill_type, sp2_id, 1200, 'immediate',
     'Clear blocked drain and inspect all drain lines on Level 2 common washroom. Provide condition report after completion.',
     'landlord'::public.payer_type, 'in_progress'::public.work_order_status, manager_auth_id),

    (wo3_id, 'WO-2025-00003', proj2_id, bldg3_id, floor4_id,
     'painting'::public.skill_type, sp3_id, 6500, '30_days',
     'Sand, prime and repaint exterior facade of Retail Block 1 entrance. Use approved colour scheme RAL 9003. Two coats minimum.',
     'landlord'::public.payer_type, 'completed'::public.work_order_status, admin_auth_id),

    (wo4_id, 'WO-2025-00004', proj1_id, bldg2_id, floor3_id,
     'electrical'::public.skill_type, sp1_id, 2800, 'immediate',
     'Diagnose and repair automatic barrier at Tower B car park entrance. Replace control board if faulty. Test with 10 access cards.',
     'landlord'::public.payer_type, 'draft'::public.work_order_status, manager_auth_id)
  ON CONFLICT (wo_number) DO NOTHING;

  -- Link work orders to maintenance requests
  INSERT INTO public.work_order_service_requests (id, work_order_id, maintenance_request_id)
  VALUES
    (gen_random_uuid(), wo1_id, mr1_id),
    (gen_random_uuid(), wo2_id, mr2_id),
    (gen_random_uuid(), wo3_id, mr3_id),
    (gen_random_uuid(), wo4_id, mr4_id)
  ON CONFLICT (id) DO NOTHING;

  -- Link work orders to service requests
  INSERT INTO public.work_order_service_requests (id, work_order_id, service_request_id)
  VALUES
    (gen_random_uuid(), wo1_id, sr5_id),
    (gen_random_uuid(), wo2_id, sr2_id)
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- 17. TURNOVER RENT (retail lease — Gulf Retail Partners, R-001)
  -- ============================================================
  INSERT INTO public.turnover_rent (
    id, unit_id, lease_id, month, year,
    monthly_sales, turnover_rent_pct, status, approval_status
  )
  VALUES
    (gen_random_uuid(), unit5_id, lease3_id, 1, 2025, 420000, 8, 'confirmed'::public.turnover_rent_status, 'approved'),
    (gen_random_uuid(), unit5_id, lease3_id, 2, 2025, 395000, 8, 'confirmed'::public.turnover_rent_status, 'approved'),
    (gen_random_uuid(), unit5_id, lease3_id, 3, 2025, 460000, 8, 'confirmed'::public.turnover_rent_status, 'approved'),
    (gen_random_uuid(), unit5_id, lease3_id, 4, 2025, 380000, 8, 'draft'::public.turnover_rent_status,     'pending')
  ON CONFLICT (unit_id, month, year) DO NOTHING;

  -- ============================================================
  -- 18. AUDIT LOG ENTRIES (sample activity trail)
  -- ============================================================
  INSERT INTO public.audit_logs (
    id, entity_type, entity_id, action, performed_by,
    before_values, after_values, created_at
  )
  VALUES
    (gen_random_uuid(), 'lease',   lease1_id::TEXT, 'create', admin_auth_id,
     NULL,
     jsonb_build_object('lease_number', 'LES-2024-001', 'status', 'active', 'rent_amount', 18000),
     now() - INTERVAL '90 days'),

    (gen_random_uuid(), 'invoice', inv4_id::TEXT, 'create', admin_auth_id,
     NULL,
     jsonb_build_object('invoice_number', 'INV-2025-0003', 'status', 'sent', 'total_amount', 18900),
     now() - INTERVAL '5 days'),

    (gen_random_uuid(), 'invoice', inv5_id::TEXT, 'status_change', manager_auth_id,
     jsonb_build_object('status', 'sent'),
     jsonb_build_object('status', 'overdue'),
     now() - INTERVAL '3 days'),

    (gen_random_uuid(), 'work_order', wo1_id::TEXT, 'create', admin_auth_id,
     NULL,
     jsonb_build_object('wo_number', 'WO-2025-00001', 'status', 'issued', 'amount', 3500),
     now() - INTERVAL '10 days'),

    (gen_random_uuid(), 'work_order', wo2_id::TEXT, 'status_change', manager_auth_id,
     jsonb_build_object('status', 'issued'),
     jsonb_build_object('status', 'in_progress'),
     now() - INTERVAL '2 days'),

    (gen_random_uuid(), 'service_request', sr4_id::TEXT, 'status_change', admin_auth_id,
     jsonb_build_object('status', 'in_progress'),
     jsonb_build_object('status', 'completed'),
     now() - INTERVAL '7 days'),

    (gen_random_uuid(), 'lease', lease2_id::TEXT, 'update', manager_auth_id,
     jsonb_build_object('end_date', '2025-06-30'),
     jsonb_build_object('end_date', '2025-07-20'),
     now() - INTERVAL '14 days'),

    (gen_random_uuid(), 'invoice', inv9_id::TEXT, 'create', admin_auth_id,
     NULL,
     jsonb_build_object('invoice_number', 'INV-2025-0007', 'status', 'sent', 'total_amount', 33600),
     now() - INTERVAL '1 day')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'PropFlow clean seed data inserted successfully.';
  RAISE NOTICE '---------------------------------------------------';
  RAISE NOTICE 'Test Credentials:';
  RAISE NOTICE '  Admin:    admin@propflow.io    / Admin@1234';
  RAISE NOTICE '  Manager:  manager@propflow.io  / Manager@1234';
  RAISE NOTICE '  Tenant:   tenant@propflow.io   / Tenant@1234';
  RAISE NOTICE '  Provider: provider@propflow.io / Provider@1234';
  RAISE NOTICE '---------------------------------------------------';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed data insertion encountered an error: %', SQLERRM;
END $$;
