-- ============================================================
-- 1. ADD PROFILE_IMAGE_URL TO SERVICE_PROVIDERS
-- ============================================================
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- ============================================================
-- 2. CREATE MOVE_IN_OUT_RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.move_in_out_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL CHECK (record_type IN ('move_in', 'move_out')),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,

  -- Move-In: Section 1 - Documents & Legal
  mi_tenancy_contract_signed BOOLEAN DEFAULT FALSE,
  mi_landlord_title_deed BOOLEAN DEFAULT FALSE,
  mi_tenant_id_documents BOOLEAN DEFAULT FALSE,
  mi_post_dated_cheques BOOLEAN DEFAULT FALSE,
  mi_security_deposit_receipt BOOLEAN DEFAULT FALSE,
  mi_agency_commission_receipt BOOLEAN DEFAULT FALSE,

  -- Move-In: Section 2 - Utilities & Services
  mi_dewa_account_activated BOOLEAN DEFAULT FALSE,
  mi_chiller_account_setup BOOLEAN DEFAULT FALSE,
  mi_internet_tv_arranged BOOLEAN DEFAULT FALSE,
  mi_building_access_card BOOLEAN DEFAULT FALSE,
  mi_amenity_cards_collected BOOLEAN DEFAULT FALSE,

  -- Move-In: Section 3 - Property Inspection
  mi_condition_report_signed BOOLEAN DEFAULT FALSE,
  mi_meter_readings_recorded BOOLEAN DEFAULT FALSE,
  mi_keys_counted_signed BOOLEAN DEFAULT FALSE,
  mi_ac_units_tested BOOLEAN DEFAULT FALSE,
  mi_water_heater_tested BOOLEAN DEFAULT FALSE,
  mi_appliances_tested BOOLEAN DEFAULT FALSE,
  mi_pest_mould_check BOOLEAN DEFAULT FALSE,

  -- Move-In: Section 4 - Practical Setup
  mi_move_in_slot_confirmed BOOLEAN DEFAULT FALSE,
  mi_municipality_fees_confirmed BOOLEAN DEFAULT FALSE,
  mi_renters_insurance_arranged BOOLEAN DEFAULT FALSE,
  mi_emergency_contacts_saved BOOLEAN DEFAULT FALSE,

  mi_notes TEXT,
  mi_date DATE,

  -- Move-Out: Section 1 - Notice & Legal
  mo_vacating_notice_served BOOLEAN DEFAULT FALSE,
  mo_rera_requirements_confirmed BOOLEAN DEFAULT FALSE,
  mo_ejari_cancellation_arranged BOOLEAN DEFAULT FALSE,
  mo_outstanding_rent_settled BOOLEAN DEFAULT FALSE,
  mo_bounced_cheques_resolved BOOLEAN DEFAULT FALSE,

  -- Move-Out: Section 2 - Utilities & Services
  mo_dewa_account_closed BOOLEAN DEFAULT FALSE,
  mo_chiller_account_closed BOOLEAN DEFAULT FALSE,
  mo_internet_tv_cancelled BOOLEAN DEFAULT FALSE,
  mo_final_meter_readings BOOLEAN DEFAULT FALSE,
  mo_municipality_fee_final BOOLEAN DEFAULT FALSE,

  -- Move-Out: Section 3 - Property Handover
  mo_deep_clean_completed BOOLEAN DEFAULT FALSE,
  mo_ac_filter_serviced BOOLEAN DEFAULT FALSE,
  mo_damage_repaired BOOLEAN DEFAULT FALSE,
  mo_keys_returned BOOLEAN DEFAULT FALSE,
  mo_joint_exit_inspection BOOLEAN DEFAULT FALSE,
  mo_handover_certificate BOOLEAN DEFAULT FALSE,
  mo_pest_control_certificate BOOLEAN DEFAULT FALSE,

  -- Move-Out: Section 4 - Deposit & Finances
  mo_deposit_refund_agreed BOOLEAN DEFAULT FALSE,
  mo_itemised_deductions_requested BOOLEAN DEFAULT FALSE,
  mo_dispute_raised_rera BOOLEAN DEFAULT FALSE,
  mo_post_dated_cheques_returned BOOLEAN DEFAULT FALSE,

  -- Move-Out: Section 5 - Practical Wrap-Up
  mo_mail_redirect_updated BOOLEAN DEFAULT FALSE,
  mo_address_updated_employer BOOLEAN DEFAULT FALSE,
  mo_vehicle_registration_updated BOOLEAN DEFAULT FALSE,
  mo_school_healthcare_updated BOOLEAN DEFAULT FALSE,
  mo_move_out_slot_confirmed BOOLEAN DEFAULT FALSE,

  mo_notes TEXT,
  mo_date DATE,

  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_move_in_out_unit ON public.move_in_out_records(unit_id);
CREATE INDEX IF NOT EXISTS idx_move_in_out_project ON public.move_in_out_records(project_id);
CREATE INDEX IF NOT EXISTS idx_move_in_out_type ON public.move_in_out_records(record_type);
