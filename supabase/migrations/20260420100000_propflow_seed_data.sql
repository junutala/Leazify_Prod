-- PropFlow Seed Data Migration
-- Adds sample data across all modules for demonstration purposes

DO $$
DECLARE
    -- User profile IDs (from existing user_profiles)
    admin_id UUID;
    manager_id UUID;

    -- Project / Building / Floor IDs
    proj1_id UUID;
    proj2_id UUID;
    bldg1_id UUID;
    bldg2_id UUID;
    floor1_id UUID;
    floor2_id UUID;
    floor3_id UUID;

    -- Property / Unit IDs
    prop1_id UUID;
    prop2_id UUID;
    unit1_id UUID;
    unit2_id UUID;
    unit3_id UUID;
    unit4_id UUID;
    unit5_id UUID;

    -- Tenant IDs
    tenant1_id UUID;
    tenant2_id UUID;
    tenant3_id UUID;
    tenant4_id UUID;

    -- Person IDs (lessees)
    person1_id UUID;
    person2_id UUID;
    person3_id UUID;
    person4_id UUID;

    -- Lease IDs
    lease1_id UUID;
    lease2_id UUID;
    lease3_id UUID;
    lease4_id UUID;

    -- Invoice IDs
    inv1_id UUID;
    inv2_id UUID;
    inv3_id UUID;
    inv4_id UUID;
    inv5_id UUID;
    inv6_id UUID;

    -- Service Provider IDs
    sp1_id UUID;
    sp2_id UUID;
    sp3_id UUID;

    -- Service Request IDs
    sr1_id UUID;
    sr2_id UUID;
    sr3_id UUID;
    sr4_id UUID;
    sr5_id UUID;

    -- Maintenance Request IDs
    mr1_id UUID;
    mr2_id UUID;
    mr3_id UUID;

    -- Work Order IDs
    wo1_id UUID;
    wo2_id UUID;
    wo3_id UUID;

BEGIN
    -- -------------------------------------------------------
    -- 1. Fetch existing admin/manager user profile IDs
    -- -------------------------------------------------------
    SELECT id INTO admin_id FROM public.user_profiles WHERE role = 'admin' LIMIT 1;
    SELECT id INTO manager_id FROM public.user_profiles WHERE role = 'manager' LIMIT 1;

    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM public.user_profiles LIMIT 1;
    END IF;
    IF manager_id IS NULL THEN
        manager_id := admin_id;
    END IF;

    IF admin_id IS NULL THEN
        RAISE NOTICE 'No user_profiles found. Skipping seed data.';
        RETURN;
    END IF;

    -- -------------------------------------------------------
    -- 2. Fetch existing projects / buildings / floors
    -- -------------------------------------------------------
    SELECT id INTO proj1_id FROM public.projects ORDER BY created_at LIMIT 1;
    SELECT id INTO proj2_id FROM public.projects ORDER BY created_at OFFSET 1 LIMIT 1;
    IF proj2_id IS NULL THEN proj2_id := proj1_id; END IF;

    SELECT id INTO bldg1_id FROM public.buildings ORDER BY created_at LIMIT 1;
    SELECT id INTO bldg2_id FROM public.buildings ORDER BY created_at OFFSET 1 LIMIT 1;
    IF bldg2_id IS NULL THEN bldg2_id := bldg1_id; END IF;

    SELECT id INTO floor1_id FROM public.floors ORDER BY created_at LIMIT 1;
    SELECT id INTO floor2_id FROM public.floors ORDER BY created_at OFFSET 1 LIMIT 1;
    SELECT id INTO floor3_id FROM public.floors ORDER BY created_at OFFSET 2 LIMIT 1;
    IF floor2_id IS NULL THEN floor2_id := floor1_id; END IF;
    IF floor3_id IS NULL THEN floor3_id := floor1_id; END IF;

    -- -------------------------------------------------------
    -- 3. Properties
    -- -------------------------------------------------------
    prop1_id := gen_random_uuid();
    prop2_id := gen_random_uuid();

    INSERT INTO public.properties (id, project_id, name, address, property_type, total_floors, owner_id)
    VALUES
        (prop1_id, proj1_id, 'Marina Tower A', 'Plot 12, Dubai Marina, Dubai', 'office'::public.property_type, 15, admin_id),
        (prop2_id, proj2_id, 'Downtown Retail Plaza', 'Sheikh Zayed Road, Downtown Dubai', 'retail'::public.property_type, 4, admin_id)
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------
    -- 4. Units
    -- -------------------------------------------------------
    unit1_id := gen_random_uuid();
    unit2_id := gen_random_uuid();
    unit3_id := gen_random_uuid();
    unit4_id := gen_random_uuid();
    unit5_id := gen_random_uuid();

    INSERT INTO public.units (id, property_id, unit_number, floor_number, unit_type, area_sqft, status, monthly_rent, floor_id)
    VALUES
        (unit1_id, prop1_id, 'A-101', 1, 'office'::public.property_type, 1200, 'occupied'::public.unit_status, 18000, floor1_id),
        (unit2_id, prop1_id, 'A-201', 2, 'office'::public.property_type, 950,  'occupied'::public.unit_status, 14500, floor2_id),
        (unit3_id, prop1_id, 'A-301', 3, 'office'::public.property_type, 1500, 'vacant'::public.unit_status,   22000, floor3_id),
        (unit4_id, prop2_id, 'R-001', 1, 'retail'::public.property_type, 800,  'occupied'::public.unit_status, 25000, floor1_id),
        (unit5_id, prop2_id, 'R-002', 1, 'retail'::public.property_type, 600,  'maintenance'::public.unit_status, 19000, floor1_id)
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------
    -- 5. Persons (lessees)
    -- -------------------------------------------------------
    person1_id := gen_random_uuid();
    person2_id := gen_random_uuid();
    person3_id := gen_random_uuid();
    person4_id := gen_random_uuid();

    INSERT INTO public.persons (id, person_type, name, email, mobile, national_id, contact_address)
    VALUES
        (person1_id, 'company'::public.person_type,    'Nexus Tech LLC',         'accounts@nexustech.ae',   '+971501234567', 'TL-2021-00123', 'Office 501, Business Bay, Dubai'),
        (person2_id, 'individual'::public.person_type, 'Sarah Al Mansouri',      'sarah.mansouri@email.com','+971502345678', 'UAE-ID-88765',  'Villa 14, Jumeirah 2, Dubai'),
        (person3_id, 'company'::public.person_type,    'Gulf Retail Partners',   'finance@gulfretail.ae',   '+971503456789', 'TL-2019-00456', 'Floor 3, DIFC Gate Building'),
        (person4_id, 'individual'::public.person_type, 'Mohammed Al Rashidi',    'mo.rashidi@email.com',    '+971504567890', 'UAE-ID-77321',  'Apt 22B, JLT Cluster Q')
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------
    -- 6. Tenants
    -- -------------------------------------------------------
    tenant1_id := gen_random_uuid();
    tenant2_id := gen_random_uuid();
    tenant3_id := gen_random_uuid();
    tenant4_id := gen_random_uuid();

    INSERT INTO public.tenants (id, full_name, email, phone, nationality, id_type, id_number)
    VALUES
        (tenant1_id, 'Nexus Tech LLC',       'accounts@nexustech.ae',    '+971501234567', 'UAE',     'trade_licence', 'TL-2021-00123'),
        (tenant2_id, 'Sarah Al Mansouri',    'sarah.mansouri@email.com', '+971502345678', 'Emirati', 'national_id',   'UAE-ID-88765'),
        (tenant3_id, 'Gulf Retail Partners', 'finance@gulfretail.ae',    '+971503456789', 'UAE',     'trade_licence', 'TL-2019-00456'),
        (tenant4_id, 'Mohammed Al Rashidi',  'mo.rashidi@email.com',     '+971504567890', 'Emirati', 'national_id',   'UAE-ID-77321')
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------
    -- 7. Leases
    -- -------------------------------------------------------
    lease1_id := gen_random_uuid();
    lease2_id := gen_random_uuid();
    lease3_id := gen_random_uuid();
    lease4_id := gen_random_uuid();

    INSERT INTO public.leases (id, unit_id, lessee_person_id, start_date, end_date, rent_amount, security_deposit, payment_terms, status, lease_number, annual_increment_pct, created_by)
    VALUES
        (lease1_id, unit1_id, person1_id, '2024-01-01', '2026-12-31', 18000, 36000, '30_days'::public.payment_terms, 'active'::public.lease_status,   'LES-2024-001', 5,  admin_id),
        (lease2_id, unit2_id, person2_id, '2024-03-15', '2025-03-14', 14500, 29000, 'immediate'::public.payment_terms,'active'::public.lease_status,   'LES-2024-002', 3,  admin_id),
        (lease3_id, unit4_id, person3_id, '2023-07-01', '2025-06-30', 25000, 50000, '30_days'::public.payment_terms, 'active'::public.lease_status,   'LES-2023-003', 4,  manager_id),
        (lease4_id, unit5_id, person4_id, '2022-01-01', '2024-12-31', 19000, 38000, '15_days'::public.payment_terms, 'expired'::public.lease_status,  'LES-2022-004', 0,  manager_id)
    ON CONFLICT (id) DO NOTHING;

    -- Link co_tenants
    INSERT INTO public.co_tenants (id, lease_id, tenant_id, share_percentage, is_primary)
    VALUES
        (gen_random_uuid(), lease1_id, tenant1_id, 100, true),
        (gen_random_uuid(), lease2_id, tenant2_id, 100, true),
        (gen_random_uuid(), lease3_id, tenant3_id, 100, true),
        (gen_random_uuid(), lease4_id, tenant4_id, 100, true)
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------
    -- 8. Invoices
    -- -------------------------------------------------------
    inv1_id := gen_random_uuid();
    inv2_id := gen_random_uuid();
    inv3_id := gen_random_uuid();
    inv4_id := gen_random_uuid();
    inv5_id := gen_random_uuid();
    inv6_id := gen_random_uuid();

    INSERT INTO public.invoices (id, lease_id, tenant_id, unit_id, invoice_number, invoice_type, invoice_type_ext, amount, tax_amount, vat_pct, total_amount, payment_terms, due_date, status, invoice_period_start, invoice_period_end, created_by)
    VALUES
        (inv1_id, lease1_id, tenant1_id, unit1_id, 'INV-2025-0001', 'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,           18000, 900,  5, 18900, '30_days'::public.payment_terms,  '2025-02-28', 'paid'::public.invoice_status,    '2025-02-01', '2025-02-28', admin_id),
        (inv2_id, lease1_id, tenant1_id, unit1_id, 'INV-2025-0002', 'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,           18000, 900,  5, 18900, '30_days'::public.payment_terms,  '2025-03-31', 'paid'::public.invoice_status,    '2025-03-01', '2025-03-31', admin_id),
        (inv3_id, lease1_id, tenant1_id, unit1_id, 'INV-2025-0003', 'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,           18000, 900,  5, 18900, '30_days'::public.payment_terms,  '2025-04-30', 'sent'::public.invoice_status,    '2025-04-01', '2025-04-30', admin_id),
        (inv4_id, lease2_id, tenant2_id, unit2_id, 'INV-2025-0004', 'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,           14500, 725,  5, 15225, 'immediate'::public.payment_terms,'2025-03-15', 'overdue'::public.invoice_status, '2025-03-01', '2025-03-31', admin_id),
        (inv5_id, lease3_id, tenant3_id, unit4_id, 'INV-2025-0005', 'rent'::public.invoice_type, 'rent'::public.invoice_type_ext,           25000, 1250, 5, 26250, '30_days'::public.payment_terms,  '2025-04-30', 'draft'::public.invoice_status,   '2025-04-01', '2025-04-30', manager_id),
        (inv6_id, lease1_id, tenant1_id, unit1_id, 'INV-2025-0006', 'security_deposit'::public.invoice_type, 'security_deposit'::public.invoice_type_ext, 36000, 0, 0, 36000, 'immediate'::public.payment_terms, '2024-01-15', 'paid'::public.invoice_status, '2024-01-01', '2024-01-01', admin_id)
    ON CONFLICT (invoice_number) DO NOTHING;

    -- -------------------------------------------------------
    -- 9. Service Providers
    -- -------------------------------------------------------
    sp1_id := gen_random_uuid();
    sp2_id := gen_random_uuid();
    sp3_id := gen_random_uuid();

    INSERT INTO public.service_providers (id, person_type, name, trade_licence_no, skill_type, email, mobile, response_time_hours, is_active)
    VALUES
        (sp1_id, 'company'::public.person_type,    'Al Futtaim Electrics LLC',  'TL-ELEC-2020-001', 'electrical'::public.skill_type, 'ops@alfuttaimelectrics.ae', '+97143001234', 4,  true),
        (sp2_id, 'company'::public.person_type,    'ProPlumb Services',         'TL-PLMB-2019-007', 'plumbing'::public.skill_type,   'service@proplumb.ae',       '+97143005678', 8,  true),
        (sp3_id, 'individual'::public.person_type, 'Ahmed Hassan Painting',     NULL,               'painting'::public.skill_type,   'ahmed.hassan@gmail.com',    '+971509876543', 24, true)
    ON CONFLICT (id) DO NOTHING;

    -- Assign providers to projects
    INSERT INTO public.provider_project_assignments (id, provider_id, project_id)
    VALUES
        (gen_random_uuid(), sp1_id, proj1_id),
        (gen_random_uuid(), sp2_id, proj1_id),
        (gen_random_uuid(), sp3_id, proj2_id)
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------
    -- 10. Service Requests
    -- -------------------------------------------------------
    sr1_id := gen_random_uuid();
    sr2_id := gen_random_uuid();
    sr3_id := gen_random_uuid();
    sr4_id := gen_random_uuid();
    sr5_id := gen_random_uuid();

    INSERT INTO public.service_requests (id, unit_id, property_id, tenant_id, raised_by, title, description, category, priority, status, skill_type, provider_id, payer, is_common_area)
    VALUES
        (sr1_id, unit1_id, prop1_id, tenant1_id, admin_id,   'AC unit not cooling properly',      'The split AC in the main office area is not reaching the set temperature. Needs inspection.', 'hvac',        'high'::public.service_request_priority,   'in_progress'::public.service_request_status, 'mechanical'::public.skill_type,  sp1_id, 'landlord'::public.payer_type, false),
        (sr2_id, unit2_id, prop1_id, tenant2_id, manager_id, 'Leaking tap in washroom',           'Cold water tap in the executive washroom is dripping continuously.',                          'plumbing',    'medium'::public.service_request_priority, 'open'::public.service_request_status,        'plumbing'::public.skill_type,    sp2_id, 'tenant'::public.payer_type,   false),
        (sr3_id, unit4_id, prop2_id, tenant3_id, admin_id,   'Electrical socket sparking',        'Power socket near the checkout counter is sparking when plugged in. Safety hazard.',          'electrical',  'urgent'::public.service_request_priority, 'open'::public.service_request_status,        'electrical'::public.skill_type,  sp1_id, 'landlord'::public.payer_type, false),
        (sr4_id, unit1_id, prop1_id, tenant1_id, admin_id,   'Office repaint requested',          'Tenant has requested a fresh coat of paint for the interior walls before lease renewal.',     'painting',    'low'::public.service_request_priority,    'completed'::public.service_request_status,   'painting'::public.skill_type,    sp3_id, 'tenant'::public.payer_type,   false),
        (sr5_id, NULL,     prop1_id, NULL,        manager_id, 'Lobby ceiling light replacement',  'Three ceiling lights in the main lobby are not working. Common area maintenance required.',   'electrical',  'medium'::public.service_request_priority, 'open'::public.service_request_status,        'electrical'::public.skill_type,  sp1_id, 'landlord'::public.payer_type, true)
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------
    -- 11. Maintenance Requests
    -- -------------------------------------------------------
    mr1_id := gen_random_uuid();
    mr2_id := gen_random_uuid();
    mr3_id := gen_random_uuid();

    INSERT INTO public.maintenance_requests (id, project_id, building_id, floor_id, area_description, skill_type, provider_id, description, payer, status, raised_by)
    VALUES
        (mr1_id, proj1_id, bldg1_id, floor1_id, 'Ground floor corridor near lift lobby', 'electrical'::public.skill_type, sp1_id, 'Emergency lighting in the ground floor corridor has failed. Backup lights not activating during power cuts.', 'landlord'::public.payer_type, 'open'::public.maintenance_status,        admin_id),
        (mr2_id, proj1_id, bldg1_id, floor2_id, 'Level 2 common washroom',               'plumbing'::public.skill_type,   sp2_id, 'Blocked drain in the common washroom on level 2. Water pooling on the floor.',                              'landlord'::public.payer_type, 'in_progress'::public.maintenance_status, manager_id),
        (mr3_id, proj2_id, bldg2_id, floor1_id, 'Retail unit R-002 exterior facade',     'painting'::public.skill_type,   sp3_id, 'Exterior paint on the facade of unit R-002 is peeling. Requires sanding and repainting.',                    'landlord'::public.payer_type, 'completed'::public.maintenance_status,   admin_id)
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------
    -- 12. Work Orders
    -- -------------------------------------------------------
    wo1_id := gen_random_uuid();
    wo2_id := gen_random_uuid();
    wo3_id := gen_random_uuid();

    INSERT INTO public.work_orders (id, wo_number, project_id, building_id, floor_id, skill_type, provider_id, amount, payment_terms, other_instructions, payer, status, raised_by)
    VALUES
        (wo1_id, 'WO-2025-001', proj1_id, bldg1_id, floor1_id, 'electrical'::public.skill_type, sp1_id, 3500,  'immediate', 'Replace all faulty emergency lighting units in ground floor corridor. Use LED replacements only.', 'landlord'::public.payer_type, 'issued'::public.work_order_status,      admin_id),
        (wo2_id, 'WO-2025-002', proj1_id, bldg1_id, floor2_id, 'plumbing'::public.skill_type,   sp2_id, 1200,  'immediate', 'Clear blocked drain and inspect all drain lines on level 2 washroom.',                             'landlord'::public.payer_type, 'in_progress'::public.work_order_status, manager_id),
        (wo3_id, 'WO-2025-003', proj2_id, bldg2_id, floor1_id, 'painting'::public.skill_type,   sp3_id, 4800,  '30_days',   'Sand, prime and repaint exterior facade of unit R-002. Use approved colour scheme.',               'landlord'::public.payer_type, 'completed'::public.work_order_status,   admin_id)
    ON CONFLICT (wo_number) DO NOTHING;

    -- Link work orders to maintenance requests
    INSERT INTO public.work_order_service_requests (id, work_order_id, maintenance_request_id)
    VALUES
        (gen_random_uuid(), wo1_id, mr1_id),
        (gen_random_uuid(), wo2_id, mr2_id),
        (gen_random_uuid(), wo3_id, mr3_id)
    ON CONFLICT (id) DO NOTHING;

    -- Link work orders to service requests
    INSERT INTO public.work_order_service_requests (id, work_order_id, service_request_id)
    VALUES
        (gen_random_uuid(), wo1_id, sr5_id),
        (gen_random_uuid(), wo2_id, sr2_id)
    ON CONFLICT (id) DO NOTHING;

    -- -------------------------------------------------------
    -- 13. Turnover Rent samples (for retail leases)
    -- -------------------------------------------------------
    INSERT INTO public.turnover_rent (id, unit_id, lease_id, month, year, monthly_sales, turnover_rent_pct, status)
    VALUES
        (gen_random_uuid(), unit4_id, lease3_id, 1, 2025, 380000, 8, 'confirmed'::public.turnover_rent_status),
        (gen_random_uuid(), unit4_id, lease3_id, 2, 2025, 420000, 8, 'confirmed'::public.turnover_rent_status),
        (gen_random_uuid(), unit4_id, lease3_id, 3, 2025, 395000, 8, 'draft'::public.turnover_rent_status)
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'PropFlow seed data inserted successfully.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Seed data insertion encountered an error: %', SQLERRM;
END $$;
