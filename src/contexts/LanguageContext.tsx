'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'en' | 'ar';

interface Translations {
  // Nav
  nav_features: string;
  nav_getStarted: string;
  nav_signIn: string;
  nav_pricing: string;
  nav_about: string;

// ── Landing Page ──
lp_badge: string;
lp_hero_title1: string;
lp_hero_title2: string;
lp_hero_title3: string;
lp_hero_subtitle: string;
lp_hero_cta_demo: string;
lp_hero_cta_features: string;
lp_hero_float_title: string;
lp_hero_float_sub: string;
lp_trust_security: string;
lp_trust_roles: string;
lp_trust_cloud: string;
lp_trust_backups: string;
lp_trust_dashboards: string;
lp_problems_badge: string;
lp_problems_title: string;
lp_problems_subtitle: string;
lp_prob1_title: string;
lp_prob1_desc: string;
lp_prob2_title: string;
lp_prob2_desc: string;
lp_prob3_title: string;
lp_prob3_desc: string;
lp_prob4_title: string;
lp_prob4_desc: string;
lp_features_badge: string;
lp_features_title: string;
lp_features_subtitle: string;
lp_feat1_title: string;
lp_feat1_desc: string;
lp_feat2_title: string;
lp_feat2_desc: string;
lp_feat3_title: string;
lp_feat3_desc: string;
lp_feat4_title: string;
lp_feat4_desc: string;
lp_feat5_title: string;
lp_feat5_desc: string;
lp_feat6_title: string;
lp_feat6_desc: string;
lp_feat7_title: string;
lp_feat7_desc: string;
lp_feat8_title: string;
lp_feat8_desc: string;
lp_usp_badge: string;
lp_usp_title: string;
lp_usp1_title: string;
lp_usp1_item1: string;
lp_usp1_item2: string;
lp_usp1_item3: string;
lp_usp2_title: string;
lp_usp2_item1: string;
lp_usp2_item2: string;
lp_usp2_item3: string;
lp_outcomes_badge: string;
lp_outcomes_title: string;
lp_outcome1: string;
lp_outcome2: string;
lp_outcome3: string;
lp_outcome4: string;
lp_outcome5: string;
lp_cta_title: string;
lp_cta_subtitle: string;
lp_cta_btn: string;
lp_footer_tagline: string;
lp_footer_product: string;
lp_footer_contact: string;
lp_footer_privacy: string;
lp_footer_terms: string;
lp_footer_copyright: string;
lp_nav_challenges: string;
lp_nav_features: string;
lp_nav_why: string;
lp_nav_outcomes: string;
lp_nav_contact: string;
lp_nav_signin: string;
lp_nav_demo: string;
lp_modal_title: string;
lp_modal_subtitle: string;
lp_modal_name: string;
lp_modal_name_placeholder: string;
lp_modal_email: string;
lp_modal_email_placeholder: string;
lp_modal_phone: string;
lp_modal_phone_placeholder: string;
lp_modal_submit: string;
lp_modal_submitting: string;
lp_modal_privacy: string;
lp_modal_success_title: string;
lp_modal_success_desc: string;
lp_modal_success_link: string;
lp_modal_email_error: string;
lp_modal_phone_error: string;
  
  // Hero
  hero_badge: string;
  hero_title1: string;
  hero_title2: string;
  hero_subtitle: string;
  hero_cta_interest: string;
  hero_cta_signin: string;

  // Stats
  stat_uptime: string;
  stat_currency: string;
  stat_lease: string;
  stat_portal: string;
  stat_uptime_label: string;
  stat_currency_label: string;
  stat_lease_label: string;
  stat_portal_label: string;

  // USP Section
  usp_badge: string;
  usp_title: string;
  usp_subtitle: string;

  // USP Cards
  usp_fractional_title: string;
  usp_fractional_desc: string;
  usp_tenants_title: string;
  usp_tenants_desc: string;
  usp_bulk_title: string;
  usp_bulk_desc: string;
  usp_renewals_title: string;
  usp_renewals_desc: string;
  usp_service_title: string;
  usp_service_desc: string;
  usp_compliance_title: string;
  usp_compliance_desc: string;

  // Features
  features_badge: string;
  features_title: string;
  features_subtitle: string;

  // Feature cards
  feat_hierarchy_title: string;
  feat_hierarchy_desc: string;
  feat_lease_title: string;
  feat_lease_desc: string;
  feat_invoicing_title: string;
  feat_invoicing_desc: string;
  feat_receipts_title: string;
  feat_receipts_desc: string;
  feat_maintenance_title: string;
  feat_maintenance_desc: string;
  feat_roles_title: string;
  feat_roles_desc: string;
  feat_analytics_title: string;
  feat_analytics_desc: string;
  feat_portals_title: string;
  feat_portals_desc: string;
  feat_renewal_title: string;
  feat_renewal_desc: string;
  feat_bulk_title: string;
  feat_bulk_desc: string;
  feat_audit_title: string;
  feat_audit_desc: string;
  feat_uae_title: string;
  feat_uae_desc: string;
  feat_turnover_title: string;
  feat_turnover_desc: string;

  // Building type band
  building_type_band_label: string;
  building_type_residential: string;
  building_type_commercial: string;
  building_type_mixed: string;
  building_type_malls: string;

  // Portals
  portals_badge: string;
  portals_title: string;
  portals_subtitle: string;
  portal_landlord_title: string;
  portal_tenant_title: string;
  portal_provider_title: string;
  portal_landlord_1: string;
  portal_landlord_2: string;
  portal_landlord_3: string;
  portal_landlord_4: string;
  portal_landlord_5: string;
  portal_tenant_1: string;
  portal_tenant_2: string;
  portal_tenant_3: string;
  portal_tenant_4: string;
  portal_tenant_5: string;
  portal_provider_1: string;
  portal_provider_2: string;
  portal_provider_3: string;
  portal_provider_4: string;
  portal_provider_5: string;

  // Interest form
  interest_badge: string;
  interest_title: string;
  interest_subtitle: string;
  interest_benefit_1: string;
  interest_benefit_2: string;
  interest_benefit_3: string;
  interest_benefit_4: string;
  interest_contact_label: string;
  form_name: string;
  form_name_placeholder: string;
  form_email: string;
  form_email_placeholder: string;
  form_phone: string;
  form_phone_placeholder: string;
  form_company: string;
  form_company_placeholder: string;
  form_portfolio: string;
  form_portfolio_placeholder: string;
  form_message: string;
  form_message_placeholder: string;
  form_submit: string;
  form_submitting: string;
  form_privacy: string;
  form_success_title: string;
  form_success_desc: string;
  form_error_required: string;
  form_error_generic: string;
  form_title: string;
  form_subtitle: string;

  // Footer
  footer_tagline: string;
  footer_contact: string;
  footer_copyright: string;

  // Sidebar nav labels
  sidebar_dashboard: string;
  sidebar_landlord_dashboard: string;
  sidebar_property: string;
  sidebar_assignment: string;
  sidebar_leasing: string;
  sidebar_renewals: string;
  sidebar_move_in_out: string;
  sidebar_invoicing: string;
  sidebar_receipts: string;
  sidebar_communications: string;
  sidebar_tenant_portal: string;
  sidebar_provider_portal: string;
  sidebar_maintenance: string;
  sidebar_workorders: string;
  sidebar_masterdata: string;
  sidebar_bulk: string;
  sidebar_reports: string;
  sidebar_analytics: string;
  sidebar_audit_log: string;
  sidebar_staff_assignments: string;
  sidebar_settings: string;
  sidebar_notifications: string;
  sidebar_group_portfolio: string;
  sidebar_group_operations: string;
  sidebar_group_admin: string;

  // Auth screen
  auth_title: string;
  auth_subtitle: string;
  auth_feature_1: string;
  auth_feature_2: string;
  auth_feature_3: string;
  auth_feature_4: string;
  auth_feature_5: string;
  auth_feature_6: string;
  auth_copyright: string;
  login_title: string;
  login_subtitle: string;
  login_email: string;
  login_password: string;
  login_submit: string;
  login_submitting: string;
  login_portal_label: string;
  login_portal_landlord: string;
  login_portal_tenant: string;
  login_portal_provider: string;

  // Dashboard
  dash_greeting_morning: string;
  dash_greeting_afternoon: string;
  dash_greeting_evening: string;
  dash_portfolio_overview: string;
  dash_live: string;
  dash_refresh: string;
  dash_analytics: string;
  dash_add_property: string;

  // Dashboard KPI widgets
  kpi_portfolio_occupancy: string;
  kpi_units_occupied: string;
  kpi_view_properties: string;
  kpi_revenue_collected: string;
  kpi_collection_rate: string;
  kpi_active_leases: string;
  kpi_expiring_label: string;
  kpi_expire_30: string;
  kpi_all_current: string;
  kpi_rent_outstanding: string;
  kpi_action_needed: string;
  kpi_invoices_overdue: string;
  kpi_invoice_overdue_single: string;
  kpi_amc_outstanding: string;
  kpi_overdue: string;
  kpi_work_orders: string;
  kpi_unassigned: string;
  kpi_need_assignment: string;
  kpi_all_resolved: string;
  kpi_service_requests: string;
  kpi_pending_resolution: string;
  kpi_security_deposits: string;
  kpi_active_leases_count: string;
  kpi_expiring_30_days: string;
  kpi_no_expiring: string;
  kpi_require_renewal: string;
  kpi_renew: string;

  // Quick Actions
  qa_title: string;
  qa_new_lease: string;
  qa_invoicing: string;
  qa_receipts: string;
  qa_work_orders: string;
  qa_renewals: string;
  qa_properties: string;
  qa_staff: string;
  qa_reports: string;

  // Activity Feed
  af_title: string;
  af_subtitle: string;
  af_no_activity: string;
  af_action_created: string;
  af_action_updated: string;
  af_action_deleted: string;
  af_action_paid: string;
  af_action_approved: string;
  af_action_rejected: string;
  af_action_closed: string;
  af_action_resolved: string;
  af_action_cancelled: string;
  af_just_now: string;
  af_minutes_ago: string;
  af_hours_ago: string;
  af_days_ago: string;

  // Expiring Leases Table
  elt_title: string;
  elt_subtitle_loading: string;
  elt_subtitle_none: string;
  elt_subtitle_count: string;
  elt_view_all: string;
  elt_col_unit: string;
  elt_col_building: string;
  elt_col_tenant: string;
  elt_col_lease_end: string;
  elt_col_urgency: string;
  elt_col_rent: string;
  elt_renew: string;
  elt_no_expiring: string;
  elt_days_left: string;

  // Rent Collection Chart
  rcc_title: string;
  rcc_subtitle: string;
  rcc_collected: string;
  rcc_invoiced: string;
  rcc_no_data: string;
  rcc_collection_rate: string;

  // Occupancy by Project Chart
  opc_title: string;
  opc_subtitle: string;
  opc_no_data: string;
  opc_occupancy: string;
  opc_units: string;

  // Language switcher
  lang_en: string;
  lang_ar: string;

  // ── Shared form / UI ──
  btn_cancel: string;
  btn_save: string;
  btn_saving: string;
  btn_submit: string;
  btn_submitting: string;
  btn_refresh: string;
  btn_retry: string;
  btn_search: string;
  btn_download_pdf: string;
  btn_generate: string;
  btn_generating: string;
  btn_approve: string;
  btn_reject: string;
  btn_view: string;
  btn_pay: string;
  btn_back: string;
  lbl_project: string;
  lbl_building: string;
  lbl_floor: string;
  lbl_unit: string;
  lbl_all_projects: string;
  lbl_all_buildings: string;
  lbl_all_floors: string;
  lbl_all_units: string;
  lbl_select_project: string;
  lbl_select_building: string;
  lbl_select_floor: string;
  lbl_select_unit: string;
  lbl_status: string;
  lbl_actions: string;
  lbl_date: string;
  lbl_notes: string;
  lbl_all: string;
  lbl_loading: string;
  lbl_no_data: string;
  lbl_period: string;
  lbl_amount: string;
  lbl_total: string;
  lbl_type: string;
  lbl_name: string;
  lbl_description: string;
  lbl_priority: string;
  lbl_provider: string;
  lbl_unassigned: string;
  lbl_tenant: string;
  lbl_lessee: string;
  lbl_annual_rent: string;
  lbl_security_deposit: string;
  lbl_payment_term: string;
  lbl_period_label: string;
  lbl_lease_number: string;
  lbl_unit_label: string;
  lbl_building_floor: string;
  lbl_skill_type: string;
  lbl_charge: string;
  lbl_quotes: string;
  lbl_select_skill: string;
  lbl_select_provider: string;
  lbl_optional: string;
  lbl_required: string;
  lbl_aed: string;

  // ── Payment terms ──
  pt_immediate: string;
  pt_15_days: string;
  pt_30_days: string;
  pt_quarterly: string;
  pt_half_yearly: string;
  pt_annually: string;

  // ── Leasing ──
  leasing_title: string;
  leasing_subtitle: string;
  leasing_new_lease: string;
  leasing_search_placeholder: string;
  leasing_col_lease_no: string;
  leasing_col_unit: string;
  leasing_col_building_floor: string;
  leasing_col_lessee: string;
  leasing_col_annual_rent: string;
  leasing_col_sd: string;
  leasing_col_payment_term: string;
  leasing_col_period: string;
  leasing_col_status: string;
  leasing_col_actions: string;
  leasing_empty_title: string;
  leasing_empty_desc: string;
  leasing_modal_title: string;
  leasing_modal_subtitle: string;
  leasing_section_property: string;
  leasing_section_tenant: string;
  leasing_section_period: string;
  leasing_section_financial: string;
  leasing_main_tenant: string;
  leasing_co_tenant: string;
  leasing_add_co_tenant: string;
  leasing_tenant_count: string;
  leasing_lease_duration: string;
  leasing_lease_amount: string;
  leasing_annual_increment: string;
  leasing_annual_increment_note: string;
  leasing_turnover_rent: string;
  leasing_to_payment_term: string;
  leasing_amc: string;
  leasing_amc_payment_term: string;
  leasing_sd_payment_term: string;
  leasing_create_btn: string;
  leasing_detail_title: string;
  leasing_detail_subtitle: string;
  leasing_download_contract: string;
  leasing_update_status: string;
  leasing_co_tenant_error: string;
  leasing_duplicate_error: string;
  leasing_tenant_paid: string;
  leasing_landlord_paid: string;

  // ── Invoicing ──
  inv_title: string;
  inv_subtitle: string;
  inv_vat_config: string;
  inv_sidebar_all: string;
  inv_sidebar_all_desc: string;
  inv_sidebar_lease: string;
  inv_sidebar_lease_desc: string;
  inv_sidebar_amc: string;
  inv_sidebar_amc_desc: string;
  inv_sidebar_turnover: string;
  inv_sidebar_turnover_desc: string;
  inv_sidebar_bulk: string;
  inv_sidebar_bulk_desc: string;
  inv_creation_label: string;
  inv_vat_modal_title: string;
  inv_vat_modal_subtitle: string;
  inv_vat_number: string;
  inv_vat_rates: string;
  inv_vat_rent: string;
  inv_vat_sd: string;
  inv_vat_turnover: string;
  inv_vat_amc: string;
  inv_vat_misc: string;
  inv_save_vat: string;
  inv_select_project: string;
  inv_hierarchy_label: string;
  inv_invoice_type: string;
  inv_due_date: string;
  inv_period_start: string;
  inv_period_end: string;
  inv_find_leases: string;
  inv_loading_leases: string;
  inv_lease_invoice_title: string;
  inv_lease_invoice_desc: string;
  inv_amc_title: string;
  inv_amc_desc: string;
  inv_turnover_title: string;
  inv_turnover_desc: string;
  inv_bulk_title: string;
  inv_bulk_desc: string;
  inv_rent_invoice: string;
  inv_sd_invoice: string;
  inv_find_amc: string;
  inv_usage_type: string;
  inv_all_types: string;
  inv_pending: string;
  inv_already_generated: string;
  inv_col_unit: string;
  inv_col_tenant: string;
  inv_col_project: string;
  inv_col_amount: string;
  inv_col_status: string;
  inv_col_amc_amount: string;
  inv_col_payment_term: string;
  inv_generated_badge: string;
  inv_pending_badge: string;
  inv_generate_btn: string;
  inv_generating_btn: string;
  inv_generated_result: string;
  inv_skipped_result: string;
  inv_active_leases_found: string;
  inv_active_leases_amc: string;
  inv_list_total: string;
  inv_list_outstanding: string;
  inv_list_collected: string;
  inv_list_overdue: string;
  inv_search_placeholder: string;
  inv_col_invoice_no: string;
  inv_col_type: string;
  inv_col_period: string;
  inv_col_vat: string;
  inv_col_total: string;
  inv_col_due_date: string;
  inv_empty_title: string;
  inv_empty_desc: string;
  inv_detail_title: string;
  inv_detail_subtitle: string;
  inv_detail_base_amount: string;
  inv_detail_vat: string;
  inv_detail_total: string;
  inv_update_status: string;
  inv_turnover_step1: string;
  inv_turnover_step2: string;
  inv_turnover_step3: string;
  inv_month: string;
  inv_year: string;
  inv_download_csv: string;
  inv_downloading: string;
  inv_upload_csv: string;
  inv_upload_hint: string;
  inv_skip_manual: string;
  inv_csv_downloaded: string;
  inv_csv_fill_hint: string;
  inv_col_to_pct: string;
  inv_col_monthly_sales: string;
  inv_col_calculated: string;
  inv_select_all: string;
  inv_clear: string;
  inv_save_sales: string;
  inv_saving: string;
  inv_invoiced_badge: string;
  inv_approved_badge: string;
  inv_col_lease_no: string;
  inv_col_current_rent: string;
  inv_col_rent_rev: string;
  inv_col_new_rent: string;
  inv_col_current_sd: string;
  inv_col_sd_rev: string;
  inv_bulk_leases_found: string;

  // ── Receipts ──
  rec_title: string;
  rec_subtitle: string;
  rec_tab_receipts: string;
  rec_tab_cheque: string;
  rec_unpaid_title: string;
  rec_unpaid_desc: string;
  rec_find_invoices: string;
  rec_loading: string;
  rec_all_paid_title: string;
  rec_all_paid_desc: string;
  rec_total_invoiced: string;
  rec_total_collected: string;
  rec_outstanding: string;
  rec_col_invoice: string;
  rec_col_unit: string;
  rec_col_tenant: string;
  rec_col_type: string;
  rec_col_total: string;
  rec_col_paid: string;
  rec_col_balance: string;
  rec_col_due: string;
  rec_col_status: string;
  rec_col_action: string;
  rec_payment_history: string;
  rec_no_payments: string;
  rec_loading_payments: string;
  rec_record_payment: string;
  rec_payment_amount: string;
  rec_payment_date: string;
  rec_payment_method: string;
  rec_invoice_total: string;
  rec_paid: string;
  rec_balance: string;
  rec_exceeds_balance: string;
  rec_cheque_details: string;
  rec_cheque_number: string;
  rec_cheque_date: string;
  rec_bank_name: string;
  rec_transfer_details: string;
  rec_transfer_ref: string;
  rec_online_details: string;
  rec_transaction_id: string;
  rec_gateway: string;
  rec_ref_notes: string;
  rec_saving: string;
  rec_cheque_recon_title: string;
  rec_cheque_recon_desc: string;
  rec_total_cheques: string;
  rec_reconciled: string;
  rec_pending_recon: string;
  rec_all_cheques: string;
  rec_pending_filter: string;
  rec_reconciled_filter: string;
  rec_col_receipt: string;
  rec_col_cheque_no: string;
  rec_col_cheque_date: string;
  rec_col_bank: string;
  rec_col_payment_date: string;
  rec_col_recon_status: string;
  rec_col_recon_action: string;
  rec_reconciled_status: string;
  rec_pending_status: string;
  rec_mark_reconciled: string;
  rec_unreconcile: string;
  rec_cheque_empty_title: string;
  rec_cheque_empty_desc: string;

  // ── Maintenance ──
  maint_title: string;
  maint_subtitle: string;
  maint_new_sr: string;
  maint_new_mr: string;
  maint_tab_sr: string;
  maint_tab_mr: string;
  maint_search_placeholder: string;
  maint_sr_modal_title: string;
  maint_sr_modal_subtitle: string;
  maint_mr_modal_title: string;
  maint_mr_modal_subtitle: string;
  maint_col_unit: string;
  maint_col_title: string;
  maint_col_skill: string;
  maint_col_provider: string;
  maint_col_priority: string;
  maint_col_status: string;
  maint_col_quotes: string;
  maint_col_charge: string;
  maint_col_date: string;
  maint_col_actions: string;
  maint_col_project: string;
  maint_col_building_floor: string;
  maint_col_area: string;
  maint_sr_empty_title: string;
  maint_sr_empty_desc: string;
  maint_mr_empty_title: string;
  maint_mr_empty_desc: string;
  maint_area_desc: string;
  maint_title_label: string;
  maint_title_placeholder: string;
  maint_desc_placeholder: string;
  maint_desc_mr_placeholder: string;
  maint_tenant_paid_note: string;
  maint_landlord_paid_note: string;
  maint_update_title: string;
  maint_provider_charges: string;
  maint_charge_submitted: string;
  maint_enter_charge: string;
  maint_current_status: string;
  maint_images: string;
  maint_quotes_title: string;
  maint_quotes_subtitle: string;
  maint_no_quotes: string;
  maint_approve_quote: string;
  maint_view_quotes: string;

  // ── Lease Renewals ──
  renew_title: string;
  renew_subtitle: string;
  renew_tab_pending: string;
  renew_tab_create: string;
  renew_tab_approved: string;
  renew_pending_count: string;
  renew_filter_title: string;
  renew_usage_type: string;
  renew_renewal_start: string;
  renew_renewal_end: string;
  renew_load_units: string;
  renew_occupied_units: string;
  renew_enter_revision: string;
  renew_col_lease_no: string;
  renew_col_unit: string;
  renew_col_lessee: string;
  renew_col_current_rent: string;
  renew_col_rent_rev: string;
  renew_col_new_rent: string;
  renew_col_current_sd: string;
  renew_col_sd_rev: string;
  renew_col_current_to: string;
  renew_col_to_rev: string;
  renew_preview_pdf: string;
  renew_submit_approval: string;
  renew_submitting: string;
  renew_renewal_period: string;
  renew_submitted_success: string;
  renew_pending_title: string;
  renew_pending_desc: string;
  renew_pending_awaiting: string;
  renew_col_new_sd: string;
  renew_col_period: string;
  renew_col_actions: string;
  renew_approved_title: string;
  renew_approved_desc: string;
  renew_processed_count: string;
  renew_reject_title: string;
  renew_reject_reason: string;
  renew_reject_placeholder: string;
  renew_reject_btn: string;
  renew_empty_occupied: string;
  renew_empty_occupied_desc: string;
  renew_download_pdf: string;

  // ── Work Orders ──
  wo_title: string;
  wo_subtitle: string;
  wo_new: string;
  wo_search_placeholder: string;
  wo_col_wo_no: string;
  wo_col_project: string;
  wo_col_provider: string;
  wo_col_skill: string;
  wo_col_amount: string;
  wo_col_payer: string;
  wo_col_status: string;
  wo_col_date: string;
  wo_col_actions: string;
  wo_empty_title: string;
  wo_empty_desc: string;
  wo_modal_title: string;
  wo_modal_subtitle: string;
  wo_step1_title: string;
  wo_step2_title: string;
  wo_step3_title: string;
  wo_select_provider: string;
  wo_search_requests: string;
  wo_searching: string;
  wo_no_approved: string;
  wo_sr_section: string;
  wo_mr_section: string;
  wo_payment_terms: string;
  wo_payer: string;
  wo_instructions: string;
  wo_instructions_placeholder: string;
  wo_generate_btn: string;
  wo_generating_btn: string;
  wo_total_selected: string;
  wo_detail_title: string;
  wo_detail_subtitle: string;
  wo_update_status: string;
  wo_instructions_label: string;

  // ── Reports ──
  reports_title: string;
  reports_subtitle: string;
  reports_operational: string;
  reports_raw_data: string;
  reports_generate_download: string;

  // ── Analytics ──
  analytics_title: string;
  analytics_subtitle: string;
  analytics_user_activity: string;
  analytics_user_activity_sub: string;
  analytics_approval_turnaround: string;
  analytics_approval_turnaround_sub: string;

  // ── Staff Assignments / Project Assignment ──
  staff_page_title: string;
  staff_page_subtitle: string;
  staff_tab_roles: string;
  staff_tab_staff: string;
  staff_tab_assignments: string;
  staff_tab_landlords: string;
  staff_add_assignment: string;
  staff_edit_assignment: string;
  staff_select_project: string;
  staff_select_role: string;
  staff_project_required: string;

  // ── Audit Log ──
  audit_title: string;
  audit_subtitle: string;

  // ── Master Data ──
  masterdata_title: string;
  masterdata_subtitle: string;

  // ── Bulk Onboarding ──
  bulk_title: string;
  bulk_subtitle: string;

  // ── Landlord Dashboard ──
  landlord_title: string;
  landlord_subtitle: string;

  // ── Tenant Portal ──
  tenant_title: string;
  tenant_subtitle: string;

  // ── Service Provider Portal ──
  provider_title: string;
  provider_subtitle: string;

  // ── Communications ──
  comms_title: string;
  comms_subtitle: string;

  // ── Turnover Rent ──
  turnover_title: string;
  turnover_subtitle: string;
}

const en: Translations = {
  nav_features: 'Features',
  nav_getStarted: 'Get Started',
  nav_signIn: 'Sign In',
  nav_pricing: 'Pricing',
  nav_about: 'About',

  hero_badge: 'Built for UAE Property Managers & Landlords',
  hero_title1: 'Leasing Management',
  hero_title2: 'LEAZIFY IT....',
  hero_subtitle: 'Leazify brings your entire portfolio under one roof — Fractional Ownership, Multi Tenancy Contracts, Bulk Invoicing, Lease Renewals and comprehensive Service Requests. No spreadsheets. No missed renewals.',
  hero_cta_interest: 'Express Interest as a Landlord',
  hero_cta_signin: 'Sign In to Your Portal',

  stat_uptime: '99.9%',
  stat_currency: 'AED',
  stat_lease: '< 2min',
  stat_portal: '24/7',
  stat_uptime_label: 'Uptime SLA',
  stat_currency_label: 'Native Currency',
  stat_lease_label: 'Avg. Lease Creation',
  stat_portal_label: 'Portal Access',

  usp_badge: 'Why Leazify',
  usp_title: 'Built for the Complexity of UAE Real Estate',
  usp_subtitle: 'From fractional ownership structures to Dubai Tenancy Law compliance — Leazify handles what generic property software cannot.',

  usp_fractional_title: 'Fractional Ownership & Multiple Landlords',
  usp_fractional_desc: 'A single property can have multiple landlords with defined ownership shares. Leazify tracks each co-owner\'s stake, distributes income proportionally, and keeps every landlord informed.',
  usp_tenants_title: 'Multiple Tenants, Dubai-Compliant',
  usp_tenants_desc: 'Support for main tenants and co-tenants on a single lease, fully aligned with Dubai Tenancy Law. Ejari-ready documentation and RERA-compliant workflows built in.',
  usp_bulk_title: 'Bulk Invoicing at Scale',
  usp_bulk_desc: 'Generate hundreds of rent, AMC, and deposit invoices in one click. Batch-send reminders, track overdue payments, and reconcile cheques — all without manual effort.',
  usp_renewals_title: 'Automated Lease Renewals',
  usp_renewals_desc: 'Never miss a renewal deadline. Leazify tracks expiry dates, triggers approval workflows, notifies tenants, and lets you renew with updated terms in minutes.',
  usp_service_title: 'Comprehensive Service Requests',
  usp_service_desc: 'Tenants submit requests directly from their portal. Assign to service providers, track progress, manage quotes, and close work orders — end-to-end in one platform.',
  usp_compliance_title: 'UAE Regulatory Compliance',
  usp_compliance_desc: 'AED-native currency, UAE phone formats, Ejari-ready lease documents, and RERA-aligned workflows. Built from the ground up for the UAE market.',

  features_badge: 'Platform Capabilities',
  features_title: 'Everything you need to manage your portfolio',
  features_subtitle: 'From a single unit to a multi-building portfolio — Leazify scales with your business and keeps every stakeholder informed.',

  feat_hierarchy_title: 'Multi-Level Property Hierarchy',
  feat_hierarchy_desc: 'Manage projects, buildings, floors, and units in a structured hierarchy. Define usage types, floor limits, and unit capacities with full enforcement.',
  feat_lease_title: 'Smart Lease Management',
  feat_lease_desc: 'Create leases with main tenants and co-tenants, auto-generate contracts, track renewals, and manage lease status from draft to expiry. Effortlessly add multi year tenancy with annual rental increase.',
  feat_invoicing_title: 'Automated Invoicing',
  feat_invoicing_desc: 'Auto-generate rent, AMC, and security deposit invoices. Track payment status, send reminders, and maintain a complete financial audit trail.',
  feat_receipts_title: 'Receipts & Bank Reconciliation',
  feat_receipts_desc: 'Record payments by cheque, bank transfer, or online. Built-in cheque reconciliation module keeps your books clean and accurate.',
  feat_maintenance_title: 'Maintenance & Work Orders',
  feat_maintenance_desc: 'Log maintenance requests, assign service providers, track work order progress, and manage AMC contracts — all in one place.',
  feat_roles_title: 'Multi-Role Access Control',
  feat_roles_desc: 'Granular role-based permissions for staff. Define custom roles with specific module access, sub-functions, and dashboard widgets per user.',
  feat_analytics_title: 'Analytics & Reporting',
  feat_analytics_desc: 'Real-time occupancy rates, rent collection charts, expiring lease alerts, and portfolio-wide KPIs — all on a single dashboard.',
  feat_portals_title: 'Tenant & Provider Portals',
  feat_portals_desc: 'Dedicated self-service portals for tenants to view leases and invoices, and for service providers to submit quotes and manage work orders.',
  feat_renewal_title: 'Lease Renewal Workflow',
  feat_renewal_desc: 'Automated renewal tracking with approval workflows. Notify tenants, negotiate terms, and renew leases without missing a deadline.',
  feat_bulk_title: 'Bulk Onboarding',
  feat_bulk_desc: 'Import properties, tenants, and leases in bulk via CSV. Onboard your entire portfolio in minutes, not weeks.',
  feat_audit_title: 'Full Audit Trail',
  feat_audit_desc: 'Every action is logged — who did what and when. Complete audit logs for compliance, dispute resolution, and operational transparency.',
  feat_uae_title: 'UAE-Compliant & Secure',
  feat_uae_desc: 'Built for UAE real estate with AED currency, local phone formats, and data security best practices. Your data stays yours.',
  feat_turnover_title: 'Turnover Rent',
  feat_turnover_desc: 'Bulk upload monthly sales data of your tenants and seamlessly generate turnover rent invoices.',

  building_type_band_label: 'Built for every building type',
  building_type_residential: 'Residential Buildings',
  building_type_commercial: 'Commercial Buildings',
  building_type_mixed: 'Mixed Use Buildings',
  building_type_malls: 'Malls',

  portals_badge: 'Role-Based Access',
  portals_title: 'One platform, three portals',
  portals_subtitle: 'Each stakeholder gets a tailored experience — no clutter, just what they need.',
  portal_landlord_title: 'Landlord / Staff',
  portal_tenant_title: 'Tenant Portal',
  portal_provider_title: 'Service Provider',
  portal_landlord_1: 'Full portfolio dashboard',
  portal_landlord_2: 'Lease & invoice management',
  portal_landlord_3: 'Work order oversight',
  portal_landlord_4: 'Analytics & reports',
  portal_landlord_5: 'Role-based staff access',
  portal_tenant_1: 'View active leases',
  portal_tenant_2: 'Download contracts',
  portal_tenant_3: 'Track invoices & payments',
  portal_tenant_4: 'Submit service requests',
  portal_tenant_5: 'Payment history',
  portal_provider_1: 'Browse open requests',
  portal_provider_2: 'Submit competitive quotes',
  portal_provider_3: 'Manage work orders',
  portal_provider_4: 'Track earnings',
  portal_provider_5: 'Download invoices',

  interest_badge: 'For New Landlords',
  interest_title: 'Ready to bring your portfolio online?',
  interest_subtitle: 'Whether you manage 2 units or 200, Leazify can be set up and running in a day. Express your interest and our team will reach out to schedule a personalised walkthrough.',
  interest_benefit_1: 'Free onboarding consultation',
  interest_benefit_2: 'Data migration from spreadsheets',
  interest_benefit_3: 'Dedicated setup support',
  interest_benefit_4: 'Training for your team',
  interest_contact_label: 'Direct contact',
  form_name: 'Full Name',
  form_name_placeholder: 'Ahmed Al Rashidi',
  form_email: 'Email Address',
  form_email_placeholder: 'ahmed@example.com',
  form_phone: 'Phone Number',
  form_phone_placeholder: '+971 50 123 4567',
  form_company: 'Company / Trade Name',
  form_company_placeholder: 'Al Rashidi Properties LLC',
  form_portfolio: 'Portfolio Size',
  form_portfolio_placeholder: 'Select number of units',
  form_message: 'Message (optional)',
  form_message_placeholder: 'Tell us about your portfolio, current challenges, or any specific requirements...',
  form_submit: 'Express My Interest',
  form_submitting: 'Submitting...',
  form_privacy: 'Your information is kept private and never shared.',
  form_success_title: 'Thank you',
  form_success_desc: "We've received your interest and will be in touch within 24 hours to schedule a personalised demo.",
  form_error_required: 'Name and email are required.',
  form_error_generic: 'Something went wrong. Please try again or email us directly.',
  form_title: 'Express Your Interest',
  form_subtitle: "Fill in your details and we'll be in touch within 24 hours.",

  footer_tagline: '· UAE Property Management Platform',
  footer_contact: 'Contact',
  footer_copyright: 'Leazify',

  sidebar_dashboard: 'Dashboard',
  sidebar_landlord_dashboard: 'Landlord Dashboard',
  sidebar_property: 'Property Management',
  sidebar_assignment: 'Project Assignment',
  sidebar_leasing: 'Leasing',
  sidebar_renewals: 'Lease Renewals',
  sidebar_move_in_out: 'Move In / Move Out',
  sidebar_invoicing: 'Invoicing',
  sidebar_receipts: 'Receipts',
  sidebar_communications: 'Communications',
  sidebar_tenant_portal: 'Tenant Portal',
  sidebar_provider_portal: 'Provider Portal',
  sidebar_maintenance: 'Maintenance',
  sidebar_workorders: 'Work Orders',
  sidebar_masterdata: 'Master Data',
  sidebar_bulk: 'Bulk Onboarding',
  sidebar_reports: 'Reports',
  sidebar_analytics: 'Analytics',
  sidebar_audit_log: 'Audit Log',
  sidebar_staff_assignments: 'Staff Assignments',
  sidebar_settings: 'Settings',
  sidebar_notifications: 'Notifications',
  sidebar_group_portfolio: 'Portfolio',
  sidebar_group_operations: 'Operations',
  sidebar_group_admin: 'Admin',

  auth_title: 'Smart Property Management for UAE Landlords',
  auth_subtitle: 'Manage your entire portfolio — leases, invoices, maintenance, and tenants — from a single, powerful platform.',
  auth_feature_1: 'Multi-level property hierarchy management',
  auth_feature_2: 'Automated lease & invoice generation',
  auth_feature_3: 'Tenant and service provider portals',
  auth_feature_4: 'Real-time analytics & KPI dashboards',
  auth_feature_5: 'Role-based access control for staff',
  auth_feature_6: 'Cheque reconciliation & receipts',
  auth_copyright: '© Leazify · UAE Property Management Platform',
  login_title: 'Sign in to Leazify',
  login_subtitle: 'Access your portal based on your role',
  login_email: 'Email',
  login_password: 'Password',
  login_submit: 'Sign In',
  login_submitting: 'Signing in...',
  login_portal_label: 'Portal Access',
  login_portal_landlord: 'Landlord / Staff → Management Dashboard',
  login_portal_tenant: 'Tenant → Lease & Invoice Portal',
  login_portal_provider: 'Service Provider → Work Order Portal',

  dash_greeting_morning: 'Good morning',
  dash_greeting_afternoon: 'Good afternoon',
  dash_greeting_evening: 'Good evening',
  dash_portfolio_overview: 'Portfolio Overview',
  dash_live: 'Live',
  dash_refresh: 'Refresh',
  dash_analytics: 'Analytics',
  dash_add_property: 'Add Property',

  // Dashboard KPI widgets
  kpi_portfolio_occupancy: 'Portfolio Occupancy',
  kpi_units_occupied: 'units occupied',
  kpi_view_properties: 'View Properties',
  kpi_revenue_collected: 'Revenue Collected',
  kpi_collection_rate: 'Collection rate',
  kpi_active_leases: 'Active Leases',
  kpi_expiring_label: 'expiring',
  kpi_expire_30: 'expire in 30 days',
  kpi_all_current: 'All leases current',
  kpi_rent_outstanding: 'Rent Outstanding',
  kpi_action_needed: 'Action needed',
  kpi_invoices_overdue: 'invoices overdue',
  kpi_invoice_overdue_single: 'invoice overdue',
  kpi_amc_outstanding: 'AMC Outstanding',
  kpi_overdue: 'overdue',
  kpi_work_orders: 'Open Work Orders',
  kpi_unassigned: 'unassigned',
  kpi_need_assignment: 'need assignment',
  kpi_all_resolved: 'All resolved',
  kpi_service_requests: 'Service Requests',
  kpi_pending_resolution: 'Pending resolution',
  kpi_security_deposits: 'Security Deposits',
  kpi_active_leases_count: 'active leases',
  kpi_expiring_30_days: 'Expiring in 30 Days',
  kpi_no_expiring: 'No leases expiring soon',
  kpi_require_renewal: 'Require renewal action',
  kpi_renew: 'Renew',

  // Quick Actions
  qa_title: 'Quick Actions',
  qa_new_lease: 'New Lease',
  qa_invoicing: 'Invoicing',
  qa_receipts: 'Receipts',
  qa_work_orders: 'Work Orders',
  qa_renewals: 'Renewals',
  qa_properties: 'Properties',
  qa_staff: 'Staff',
  qa_reports: 'Reports',

  // Activity Feed
  af_title: 'Recent Activity',
  af_subtitle: 'Portfolio events — latest actions',
  af_no_activity: 'No activity recorded yet',
  af_action_created: 'New',
  af_action_updated: 'Updated',
  af_action_deleted: 'Deleted',
  af_action_paid: 'Payment received',
  af_action_approved: 'Approved',
  af_action_rejected: 'Rejected',
  af_action_closed: 'Closed',
  af_action_resolved: 'Resolved',
  af_action_cancelled: 'Cancelled',
  af_just_now: 'just now',
  af_minutes_ago: 'm ago',
  af_hours_ago: 'h ago',
  af_days_ago: 'd ago',

  // Expiring Leases Table
  elt_title: 'Expiring Leases',
  elt_subtitle_loading: 'Loading...',
  elt_subtitle_none: 'No leases expiring in the next 30 days',
  elt_subtitle_count: 'require renewal action',
  elt_view_all: 'View all',
  elt_col_unit: 'Unit',
  elt_col_building: 'Building',
  elt_col_tenant: 'Tenant',
  elt_col_lease_end: 'Lease End',
  elt_col_urgency: 'Urgency',
  elt_col_rent: 'Monthly Rent',
  elt_renew: 'Renew',
  elt_no_expiring: 'No leases expiring in the next 30 days',
  elt_days_left: 'd left',

  // Rent Collection Chart
  rcc_title: 'Rent Collection Trend',
  rcc_subtitle: 'Collected vs invoiced — last 6 months',
  rcc_collected: 'Collected',
  rcc_invoiced: 'Invoiced',
  rcc_no_data: 'No invoice data available yet',
  rcc_collection_rate: 'Collection rate',

  // Occupancy by Project Chart
  opc_title: 'Occupancy by Project',
  opc_subtitle: 'Current leased unit percentage',
  opc_no_data: 'No project data available yet',
  opc_occupancy: 'Occupancy',
  opc_units: 'Units',

  lang_en: 'English',
  lang_ar: 'العربية',

  // ── Shared form / UI ──
  btn_cancel: 'Cancel',
  btn_save: 'Save',
  btn_saving: 'Saving...',
  btn_submit: 'Submit',
  btn_submitting: 'Submitting...',
  btn_refresh: 'Refresh',
  btn_retry: 'Retry',
  btn_search: 'Search',
  btn_download_pdf: 'Download PDF',
  btn_generate: 'Generate',
  btn_generating: 'Generating...',
  btn_approve: 'Approve',
  btn_reject: 'Reject',
  btn_view: 'View',
  btn_pay: 'Pay',
  btn_back: 'Back',
  lbl_project: 'Project',
  lbl_building: 'Building',
  lbl_floor: 'Floor',
  lbl_unit: 'Unit',
  lbl_all_projects: 'All Projects',
  lbl_all_buildings: 'All Buildings',
  lbl_all_floors: 'All Floors',
  lbl_all_units: 'All Units',
  lbl_select_project: 'Select project',
  lbl_select_building: 'Select building',
  lbl_select_floor: 'Select floor',
  lbl_select_unit: 'Select unit',
  lbl_status: 'Status',
  lbl_actions: 'Actions',
  lbl_date: 'Date',
  lbl_notes: 'Notes',
  lbl_all: 'All',
  lbl_loading: 'Loading...',
  lbl_no_data: 'No data available',
  lbl_period: 'Period',
  lbl_amount: 'Amount',
  lbl_total: 'Total',
  lbl_type: 'Type',
  lbl_name: 'Name',
  lbl_description: 'Description',
  lbl_priority: 'Priority',
  lbl_provider: 'Service Provider',
  lbl_unassigned: 'Unassigned',
  lbl_tenant: 'Tenant',
  lbl_lessee: 'Lessee',
  lbl_annual_rent: 'Annual Rent',
  lbl_security_deposit: 'Security Deposit',
  lbl_payment_term: 'Payment Term',
  lbl_period_label: 'Period',
  lbl_lease_number: 'Lease #',
  lbl_unit_label: 'Unit',
  lbl_building_floor: 'Building / Floor',
  lbl_skill_type: 'Skill Type',
  lbl_charge: 'Charge',
  lbl_quotes: 'Quotes',
  lbl_select_skill: 'Select skill',
  lbl_select_provider: 'Select provider (optional)',
  lbl_optional: 'optional',
  lbl_required: 'required',
  lbl_aed: 'AED',

  // ── Payment terms ──
  pt_immediate: 'Immediate',
  pt_15_days: '15 Days',
  pt_30_days: '30 Days',
  pt_quarterly: 'Quarterly',
  pt_half_yearly: 'Half Yearly',
  pt_annually: 'Annually',

  // ── Leasing ──
  leasing_title: 'Lease Management',
  leasing_subtitle: 'Manage all lease contracts, renewals, and assignments',
  leasing_new_lease: 'New Lease',
  leasing_search_placeholder: 'Search leases, tenants, units...',
  leasing_col_lease_no: 'Lease #',
  leasing_col_unit: 'Unit',
  leasing_col_building_floor: 'Building / Floor',
  leasing_col_lessee: 'Lessee',
  leasing_col_annual_rent: 'Annual Rent',
  leasing_col_sd: 'Security Deposit',
  leasing_col_payment_term: 'Payment Term',
  leasing_col_period: 'Period',
  leasing_col_status: 'Status',
  leasing_col_actions: 'Actions',
  leasing_empty_title: 'No leases found',
  leasing_empty_desc: 'Create your first lease contract to get started',
  leasing_modal_title: 'New Lease Contract',
  leasing_modal_subtitle: 'Create a lease for a unit',
  leasing_section_property: 'Property Selection',
  leasing_section_tenant: 'Tenant Details',
  leasing_section_period: 'Lease Period',
  leasing_section_financial: 'Financial Terms',
  leasing_main_tenant: 'Main Tenant (Lessee)',
  leasing_co_tenant: 'Co-Tenant',
  leasing_add_co_tenant: 'Add Co-Tenant',
  leasing_tenant_count: 'tenant(s) on this lease',
  leasing_lease_duration: 'Lease duration',
  leasing_lease_amount: 'Lease Amount (Annual)',
  leasing_annual_increment: 'Annual Rent Increase %',
  leasing_annual_increment_note: 'Lease term exceeds 1 year',
  leasing_turnover_rent: 'Turnover Rent %',
  leasing_to_payment_term: 'T/O Payment Term',
  leasing_amc: 'Annual Maintenance Charges',
  leasing_amc_payment_term: 'AMC Payment Term',
  leasing_sd_payment_term: 'SD Payment Term',
  leasing_create_btn: 'Create Lease & Generate Contract',
  leasing_detail_title: 'Lease Contract Details',
  leasing_detail_subtitle: 'Lease contract details',
  leasing_download_contract: 'Download Contract',
  leasing_update_status: 'Update Status',
  leasing_co_tenant_error: 'Please select a person for each co-tenant',
  leasing_duplicate_error: 'The same person cannot be both main tenant and co-tenant',
  leasing_tenant_paid: 'This request is Tenant-paid.',
  leasing_landlord_paid: 'This request is Landlord-paid.',

  // ── Invoicing ──
  inv_title: 'Invoicing & Finance',
  inv_subtitle: 'Generate VAT invoices from lease data — rent, deposits, AMC, and turnover rent',
  inv_vat_config: 'VAT Config',
  inv_sidebar_all: 'All Invoices',
  inv_sidebar_all_desc: 'View and manage all invoices',
  inv_sidebar_lease: 'Lease & Security Deposit',
  inv_sidebar_lease_desc: 'Generate rent & deposit invoices from active leases',
  inv_sidebar_amc: 'AMC Invoice Generation',
  inv_sidebar_amc_desc: 'Generate AMC invoices for active leases',
  inv_sidebar_turnover: 'Turnover Rent',
  inv_sidebar_turnover_desc: 'Upload sales data and generate turnover rent invoices',
  inv_sidebar_bulk: 'Bulk Invoice Creation',
  inv_sidebar_bulk_desc: 'Bulk generate invoices for large number of leases with revision',
  inv_creation_label: 'Invoice Creation',
  inv_vat_modal_title: 'VAT Configuration',
  inv_vat_modal_subtitle: 'Set VAT rates per project',
  inv_vat_number: 'VAT Registration Number',
  inv_vat_rates: 'VAT Rates (%)',
  inv_vat_rent: 'Rent VAT %',
  inv_vat_sd: 'Security Deposit VAT %',
  inv_vat_turnover: 'Turnover Rent VAT %',
  inv_vat_amc: 'AMC VAT %',
  inv_vat_misc: 'Misc VAT %',
  inv_save_vat: 'Save VAT Config',
  inv_select_project: 'Select project',
  inv_hierarchy_label: 'Select Hierarchy Level',
  inv_invoice_type: 'Invoice Type *',
  inv_due_date: 'Due Date',
  inv_period_start: 'Period Start',
  inv_period_end: 'Period End',
  inv_find_leases: 'Find Active Leases',
  inv_loading_leases: 'Loading Leases...',
  inv_lease_invoice_title: 'Lease & Security Deposit Invoice Generation',
  inv_lease_invoice_desc: 'Select a level in the project hierarchy. Invoices will be generated for all active leases within the selection that have not been invoiced yet.',
  inv_amc_title: 'AMC Invoice Generation',
  inv_amc_desc: 'Select a level in the project hierarchy. AMC invoices will be generated for all active leases with an AMC amount that have not been invoiced yet.',
  inv_turnover_title: 'Turnover Rent Invoice Generation',
  inv_turnover_desc: 'Select hierarchy and month, download the CSV template with MALL units, fill in sales data, upload and review, then generate invoices for selected units.',
  inv_bulk_title: 'Bulk Invoice Creation',
  inv_bulk_desc: 'Select a hierarchy level and usage type. Enter revision percentages for each lease, then generate invoices in bulk for all pending leases.',
  inv_rent_invoice: 'Rent Invoice',
  inv_sd_invoice: 'Security Deposit Invoice',
  inv_find_amc: 'Find Active Leases with AMC',
  inv_usage_type: 'Usage Type',
  inv_all_types: 'All Types',
  inv_pending: 'pending',
  inv_already_generated: 'already generated',
  inv_col_unit: 'Unit',
  inv_col_tenant: 'Tenant',
  inv_col_project: 'Project',
  inv_col_amount: 'Amount',
  inv_col_status: 'Status',
  inv_col_amc_amount: 'AMC Amount',
  inv_col_payment_term: 'Payment Term',
  inv_generated_badge: 'Generated',
  inv_pending_badge: 'Pending',
  inv_generate_btn: 'Generate Invoices',
  inv_generating_btn: 'Generating...',
  inv_generated_result: 'invoice(s) generated',
  inv_skipped_result: 'lease(s) already had invoices (skipped)',
  inv_active_leases_found: 'active lease(s) found',
  inv_active_leases_amc: 'active lease(s) with AMC found',
  inv_list_total: 'Total Invoices',
  inv_list_outstanding: 'Outstanding',
  inv_list_collected: 'Collected',
  inv_list_overdue: 'Overdue',
  inv_search_placeholder: 'Search invoices...',
  inv_col_invoice_no: 'Invoice #',
  inv_col_type: 'Type',
  inv_col_period: 'Period',
  inv_col_vat: 'VAT',
  inv_col_total: 'Total',
  inv_col_due_date: 'Due Date',
  inv_empty_title: 'No invoices found',
  inv_empty_desc: 'Generate invoices using the panels on the left',
  inv_detail_title: 'Invoice Details',
  inv_detail_subtitle: 'Invoice details and status management',
  inv_detail_base_amount: 'Base Amount',
  inv_detail_vat: 'VAT',
  inv_detail_total: 'Total Amount',
  inv_update_status: 'Update Status',
  inv_turnover_step1: 'Select & Download',
  inv_turnover_step2: 'Upload CSV',
  inv_turnover_step3: 'Review & Generate',
  inv_month: 'Month *',
  inv_year: 'Year *',
  inv_download_csv: 'Download CSV Template',
  inv_downloading: 'Generating...',
  inv_upload_csv: 'Click to upload CSV file',
  inv_upload_hint: 'Must contain unit_id and monthly_sales columns',
  inv_skip_manual: 'Skip — Enter Manually',
  inv_csv_downloaded: 'CSV Downloaded',
  inv_csv_fill_hint: 'Fill in the monthly_sales column for each unit and upload the file below.',
  inv_col_to_pct: 'T/O Rent %',
  inv_col_monthly_sales: 'Monthly Sales (AED)',
  inv_col_calculated: 'Calculated Rent',
  inv_select_all: 'Select All',
  inv_clear: 'Clear',
  inv_save_sales: 'Save Sales Data',
  inv_saving: 'Saving...',
  inv_invoiced_badge: 'Invoiced',
  inv_approved_badge: 'Approved',
  inv_col_lease_no: 'Lease #',
  inv_col_current_rent: 'Current Rent',
  inv_col_rent_rev: 'Rent Rev %',
  inv_col_new_rent: 'New Rent',
  inv_col_current_sd: 'Current SD',
  inv_col_sd_rev: 'SD Rev %',
  inv_bulk_leases_found: 'active lease(s) found',

  // ── Receipts ──
  rec_title: 'Receipts',
  rec_subtitle: 'Record payments against invoices and reconcile cheque receipts',
  rec_tab_receipts: 'Record Receipts',
  rec_tab_cheque: 'Cheque Reconciliation',
  rec_unpaid_title: 'Unpaid & Partially Paid Invoices',
  rec_unpaid_desc: 'Select a project hierarchy level to view outstanding invoices and record payments.',
  rec_find_invoices: 'Find Invoices',
  rec_loading: 'Loading...',
  rec_all_paid_title: 'All invoices are paid',
  rec_all_paid_desc: 'No unpaid or partially paid invoices found for the selected hierarchy',
  rec_total_invoiced: 'Total Invoiced',
  rec_total_collected: 'Total Collected',
  rec_outstanding: 'Outstanding Balance',
  rec_col_invoice: 'Invoice #',
  rec_col_unit: 'Unit',
  rec_col_tenant: 'Tenant',
  rec_col_type: 'Type',
  rec_col_total: 'Total',
  rec_col_paid: 'Paid',
  rec_col_balance: 'Balance',
  rec_col_due: 'Due Date',
  rec_col_status: 'Status',
  rec_col_action: 'Action',
  rec_payment_history: 'Payment History',
  rec_no_payments: 'No payments recorded yet.',
  rec_loading_payments: 'Loading...',
  rec_record_payment: 'Record Payment',
  rec_payment_amount: 'Payment Amount (AED) *',
  rec_payment_date: 'Payment Date *',
  rec_payment_method: 'Payment Method *',
  rec_invoice_total: 'Invoice Total',
  rec_paid: 'Paid',
  rec_balance: 'Balance',
  rec_exceeds_balance: 'Exceeds outstanding balance',
  rec_cheque_details: 'Cheque Details',
  rec_cheque_number: 'Cheque Number *',
  rec_cheque_date: 'Cheque Date',
  rec_bank_name: 'Bank Name',
  rec_transfer_details: 'Bank Transfer Details',
  rec_transfer_ref: 'Transfer Reference *',
  rec_online_details: 'Online Payment Details',
  rec_transaction_id: 'Transaction ID *',
  rec_gateway: 'Payment Gateway',
  rec_ref_notes: 'Reference / Notes',
  rec_saving: 'Saving...',
  rec_cheque_recon_title: 'Cheque Bank Reconciliation',
  rec_cheque_recon_desc: 'Track and reconcile cheque payments against bank statements.',
  rec_total_cheques: 'Total Cheques',
  rec_reconciled: 'Reconciled',
  rec_pending_recon: 'Pending Reconciliation',
  rec_all_cheques: 'All Cheques',
  rec_pending_filter: 'Pending',
  rec_reconciled_filter: 'Reconciled',
  rec_col_receipt: 'Receipt #',
  rec_col_cheque_no: 'Cheque No.',
  rec_col_cheque_date: 'Cheque Date',
  rec_col_bank: 'Bank',
  rec_col_payment_date: 'Payment Date',
  rec_col_recon_status: 'Status',
  rec_col_recon_action: 'Action',
  rec_reconciled_status: 'Reconciled',
  rec_pending_status: 'Pending',
  rec_mark_reconciled: 'Mark Reconciled',
  rec_unreconcile: 'Unreconcile',
  rec_cheque_empty_title: 'No cheque payments found',
  rec_cheque_empty_desc: 'Cheque payments will appear here for reconciliation',

  // ── Maintenance ──
  maint_title: 'Maintenance & Service Requests',
  maint_subtitle: 'Separate streams: Service Requests (tenant-paid) and Maintenance Requests (landlord-paid)',
  maint_new_sr: 'Service Request',
  maint_new_mr: 'Maintenance Request',
  maint_tab_sr: 'Service Requests',
  maint_tab_mr: 'Maintenance Requests',
  maint_search_placeholder: 'Search requests...',
  maint_sr_modal_title: 'New Service Request',
  maint_sr_modal_subtitle: 'Unit-level request — Tenant paid',
  maint_mr_modal_title: 'New Maintenance Request',
  maint_mr_modal_subtitle: 'Common area request — Landlord paid',
  maint_col_unit: 'Unit',
  maint_col_title: 'Title',
  maint_col_skill: 'Skill Type',
  maint_col_provider: 'Provider',
  maint_col_priority: 'Priority',
  maint_col_status: 'Status',
  maint_col_quotes: 'Quotes',
  maint_col_charge: 'Charge',
  maint_col_date: 'Date',
  maint_col_actions: 'Actions',
  maint_col_project: 'Project',
  maint_col_building_floor: 'Building / Floor',
  maint_col_area: 'Area',
  maint_sr_empty_title: 'No service requests',
  maint_sr_empty_desc: 'Submit a new service request to get started',
  maint_mr_empty_title: 'No maintenance requests',
  maint_mr_empty_desc: 'Submit a new maintenance request to get started',
  maint_area_desc: 'Area Description',
  maint_title_label: 'Title',
  maint_title_placeholder: 'Brief description of the issue',
  maint_desc_placeholder: 'Detailed description of the problem...',
  maint_desc_mr_placeholder: 'Describe the maintenance issue...',
  maint_tenant_paid_note: 'This request is Tenant-paid.',
  maint_landlord_paid_note: 'This request is Landlord-paid.',
  maint_update_title: 'Update Request',
  maint_provider_charges: 'Service Provider Charges',
  maint_charge_submitted: 'Charge submitted',
  maint_enter_charge: 'Enter charge amount (AED)',
  maint_current_status: 'Current:',
  maint_images: 'Attached Images',
  maint_quotes_title: 'Quotes',
  maint_quotes_subtitle: 'Quotes for request',
  maint_no_quotes: 'No quotes submitted yet.',
  maint_approve_quote: 'Approve',
  maint_view_quotes: 'View',

  // ── Lease Renewals ──
  renew_title: 'Lease Renewals',
  renew_subtitle: 'Review and revise rent for occupied units. Generate renewed leases for approval.',
  renew_tab_pending: 'Pending Approval',
  renew_tab_create: 'Create Renewals',
  renew_tab_approved: 'Approved / Rejected',
  renew_pending_count: 'renewed lease(s) awaiting approval',
  renew_filter_title: 'Filter Occupied Units',
  renew_usage_type: 'Usage Type',
  renew_renewal_start: 'Renewal Start *',
  renew_renewal_end: 'Renewal End *',
  renew_load_units: 'Load Occupied Units',
  renew_occupied_units: 'occupied units',
  renew_enter_revision: 'Enter + or - % to revise rent, deposit, and turnover rent',
  renew_col_lease_no: 'Lease #',
  renew_col_unit: 'Unit',
  renew_col_lessee: 'Lessee',
  renew_col_current_rent: 'Current Rent',
  renew_col_rent_rev: 'Rent Revision %',
  renew_col_new_rent: 'New Rent',
  renew_col_current_sd: 'Current SD',
  renew_col_sd_rev: 'SD Revision %',
  renew_col_current_to: 'Current T/O %',
  renew_col_to_rev: 'T/O Revision %',
  renew_preview_pdf: 'Preview PDF',
  renew_submit_approval: 'Submit for Approval',
  renew_submitting: 'Submitting...',
  renew_renewal_period: 'Renewal period',
  renew_submitted_success: 'Renewed leases submitted for approval. Review them in the Pending Approval tab.',
  renew_pending_title: 'No pending renewals',
  renew_pending_desc: 'Renewed leases submitted for approval will appear here',
  renew_pending_awaiting: 'renewed lease(s) awaiting approval',
  renew_col_new_sd: 'New SD',
  renew_col_period: 'Period',
  renew_col_actions: 'Actions',
  renew_approved_title: 'No processed renewals',
  renew_approved_desc: 'Approved and rejected renewed leases will appear here',
  renew_processed_count: 'processed renewal(s)',
  renew_reject_title: 'Reject Renewal',
  renew_reject_reason: 'Rejection Reason *',
  renew_reject_placeholder: 'Enter reason for rejection...',
  renew_reject_btn: 'Reject Renewal',
  renew_empty_occupied: 'No occupied units',
  renew_empty_occupied_desc: 'Select a project and click Load Occupied Units to begin',
  renew_download_pdf: 'Download PDF',

  // ── Work Orders ──
  wo_title: 'Work Orders',
  wo_subtitle: 'Generate and manage work orders for service providers',
  wo_new: 'Generate Work Order',
  wo_search_placeholder: 'Search work orders...',
  wo_col_wo_no: 'WO #',
  wo_col_project: 'Project',
  wo_col_provider: 'Provider',
  wo_col_skill: 'Skill',
  wo_col_amount: 'Amount',
  wo_col_payer: 'Payer',
  wo_col_status: 'Status',
  wo_col_date: 'Date',
  wo_col_actions: 'Actions',
  wo_empty_title: 'No work orders found',
  wo_empty_desc: 'Generate a work order from approved service or maintenance requests',
  wo_modal_title: 'Generate Work Order',
  wo_modal_subtitle: 'Select project and service provider, then search for approved requests',
  wo_step1_title: 'Step 1: Select Project & Service Provider',
  wo_step2_title: 'Step 2: Select Approved Requests',
  wo_step3_title: 'Step 3: Work Order Details',
  wo_select_provider: 'Select provider',
  wo_search_requests: 'Search Approved Requests',
  wo_searching: 'Searching...',
  wo_no_approved: 'No approved quotes or completed requests found for this project and service provider.',
  wo_sr_section: 'Service Requests',
  wo_mr_section: 'Maintenance Requests',
  wo_payment_terms: 'Payment Terms',
  wo_payer: 'Payer',
  wo_instructions: 'Other Instructions',
  wo_instructions_placeholder: 'Any special instructions for the service provider...',
  wo_generate_btn: 'Generate Work Order',
  wo_generating_btn: 'Generating...',
  wo_total_selected: 'selected',
  wo_detail_title: 'Work Order Details',
  wo_detail_subtitle: 'Work order details and status management',
  wo_update_status: 'Update Status',
  wo_instructions_label: 'Instructions',

  // ── Reports ──
  reports_title: 'Reports',
  reports_subtitle: 'Generate and download operational reports as PDF or CSV',
  reports_operational: 'Operational Reports',
  reports_raw_data: 'Raw Data Reports',
  reports_generate_download: 'Generate and download operational reports as PDF or CSV',

  // ── Analytics ──
  analytics_title: 'Analytics',
  analytics_subtitle: 'Key metrics derived from audit logs, leases, and invoices',
  analytics_user_activity: 'User Activity',
  analytics_user_activity_sub: 'Audit log events per user and day over the last 7 days',
  analytics_approval_turnaround: 'Approval Turnaround Times',
  analytics_approval_turnaround_sub: 'Approval and rejection rates derived from audit log events',

  // ── Staff Assignments / Project Assignment ──
  staff_page_title: 'Project Assignment',
  staff_page_subtitle: 'Create roles, add staff, assign projects, and manage landlord ownership.',
  staff_tab_roles: 'Roles & Responsibilities',
  staff_tab_staff: 'Staff',
  staff_tab_assignments: 'Project Assignments',
  staff_tab_landlords: 'Landlord Assignments',
  staff_add_assignment: 'Add Assignment',
  staff_edit_assignment: 'Edit Assignment',
  staff_select_project: 'Select project...',
  staff_select_role: 'Select role...',
  staff_project_required: 'Project and role are required',

  // ── Audit Log ──
  audit_title: 'Audit Log',
  audit_subtitle: 'Track all entity changes with timestamps, users, and before/after values',

  // ── Master Data ──
  masterdata_title: 'Master Data',
  masterdata_subtitle: 'Manage service providers, persons, and system lookup tables',

  // ── Bulk Onboarding ──
  bulk_title: 'Bulk Onboarding',
  bulk_subtitle: 'Upload CSV files to onboard estate hierarchy, persons, and service providers at scale',

  // ── Landlord Dashboard ──
  landlord_title: 'Landlord Dashboard',
  landlord_subtitle: 'Your portfolio overview and key metrics',

  // ── Tenant Portal ──
  tenant_title: 'Tenant Portal',
  tenant_subtitle: 'View your lease, invoices, and submit service requests',

  // ── Service Provider Portal ──
  provider_title: 'Service Provider Portal',
  provider_subtitle: 'Browse open requests, submit quotes, and manage work orders',

  // ── Communications ──
  comms_title: 'Communications',
  comms_subtitle: 'Send messages and notifications to tenants and staff',

  // ── Turnover Rent ──
  turnover_title: 'Turnover Rent',
  turnover_subtitle: 'Manage turnover rent data and invoices',
// ── Move In / Move Out ──
mio_title: 'Move In / Move Out',
mio_subtitle: 'GCC tenancy checklist — select a unit to begin',
mio_select_unit: 'Select Unit',
mio_select_project: 'Select project…',
mio_select_building: 'Select building…',
mio_select_floor: 'Select floor…',
mio_select_unit_option: 'Select unit…',
mio_status_move_in_recorded: 'Move In ✓ Recorded',
mio_status_move_in_not: 'Move In — Not recorded',
mio_status_move_out_recorded: 'Move Out ✓ Recorded',
mio_status_move_out_not: 'Move Out — Not recorded',
mio_both_recorded_title: 'Both Move In and Move Out are recorded for this unit.',
mio_both_recorded_desc: 'Select a different unit to create a new record.',
mio_checklist_move_in: 'Move In Checklist',
mio_checklist_move_out: 'Move Out Checklist',
mio_items_completed: 'items completed',
mio_date_move_in: 'Move In Date',
mio_date_move_out: 'Move Out Date',
mio_date_placeholder: 'DD-MM-YYYY',
mio_date_error: 'Please enter a valid date in DD-MM-YYYY format',
mio_photos_videos: 'Photos & Videos',
mio_upload_click: 'Click or drag to upload',
mio_upload_hint: 'Up to 10 images & 2 videos',
mio_notes: 'Notes',
mio_notes_placeholder: 'Any additional notes or observations…',
mio_save: 'Save Checklist',
mio_saving: 'Saving…',
mio_save_success: 'Checklist saved successfully.',
mio_empty_title: 'Select a unit to get started',
mio_empty_desc: 'Choose project → building → floor → unit to view or create a Move In / Move Out checklist.',
mio_of: 'of',

// Move In sections
mio_section_documents: 'Documents & Legal',
mio_section_utilities: 'Utilities & Services',
mio_section_inspection: 'Property Inspection',
mio_section_practical: 'Practical Setup',

// Move In fields
mio_mi_tenancy_contract: 'Signed tenancy contract (Ejari registered in Dubai / Tawtheeq in Abu Dhabi)',
mio_mi_tenant_id: 'Passport copies & visa / Emirates ID of all tenants',
mio_mi_cheques: 'Post-dated cheques handed over',
mio_mi_deposit: 'Security Deposit Cheque',
mio_mi_dewa: 'DEWA / ADDC / SEWA account activated',
mio_mi_chiller: 'Chiller / district cooling account set up',
mio_mi_internet: 'Internet & TV package arranged',
mio_mi_access_card: 'Building access card / parking permit obtained',
mio_mi_amenity: 'Gym, pool & amenity access cards collected',
mio_mi_condition_report: 'Full condition report signed by landlord & tenant',
mio_mi_meter_readings: 'Meter readings recorded (electricity, water, gas)',
mio_mi_keys: 'All keys, fobs & remotes counted and signed for',
mio_mi_ac: 'AC units tested (split & central)',
mio_mi_water_heater: 'Water heater & boiler tested',
mio_mi_appliances: 'All appliances tested if furnished',
mio_mi_pest: 'Check for pest or mould issues',
mio_mi_slot: 'Confirm building move-in slot with management',
mio_mi_municipality: 'Municipality fees confirmed',
mio_mi_insurance: "Renter's insurance arranged",
mio_mi_emergency: 'Emergency maintenance contacts saved (building, AC, plumber)',

// Move Out sections
mio_section_notice: 'Notice & Legal',
mio_section_mo_utilities: 'Utilities & Services',
mio_section_handover: 'Property Handover',
mio_section_deposit: 'Deposit & Finances',
mio_section_wrapup: 'Practical Wrap-Up',

// Move Out fields
mio_mo_notice: 'Written vacating notice served within contract timeline',
mio_mo_rera: 'Confirm RERA / tenancy law notice requirements',
mio_mo_ejari: 'Ejari / Tawtheeq cancellation arranged',
mio_mo_rent_settled: 'Outstanding rent / cheques confirmed settled',
mio_mo_bounced: 'Any bounced cheque issues resolved before departure',
mio_mo_dewa: 'DEWA / ADDC / SEWA account closed & final bill paid',
mio_mo_chiller: 'Chiller / district cooling account closed',
mio_mo_internet: 'Internet / TV contract cancelled or transferred',
mio_mo_meter: 'Final meter readings photographed on exit day',
mio_mo_municipality: 'Municipality & housing fee final payment confirmed',
mio_mo_clean: 'Full property deep clean completed',
mio_mo_ac: 'AC filter cleaning & servicing done',
mio_mo_damage: 'Damage beyond fair wear & tear repaired',
mio_mo_keys: 'All keys, fobs, remotes & access cards returned',
mio_mo_inspection: 'Joint exit inspection conducted with landlord',
mio_mo_certificate: 'Signed handover certificate obtained from landlord',
mio_mo_pest: 'Pest control certificate if required by contract',
mio_mo_deposit_agreed: 'Security deposit refund timeline agreed in writing',
mio_mo_deductions: 'Itemised deductions list requested if any deductions made',
mio_mo_dispute: 'Dispute raised via RERA Rental Disputes Centre if needed',
mio_mo_cheques_returned: 'Post-dated cheques returned or confirmed cancelled',
mio_mo_mail: 'Mail redirect / PO Box updated',
mio_mo_address: 'Address updated with employer, bank, insurance',
mio_mo_vehicle: 'Vehicle registration address updated (RTA / traffic dept)',
mio_mo_school: 'School / healthcare records updated if applicable',
mio_mo_slot: 'Confirm building move-out slot and lift booking',
  
// ── Landing Page ──
  lp_badge: 'One Smart Platform',
  lp_hero_title1: 'Leasing Management Software for',
  lp_hero_title2: 'Residential & Retail',
  lp_hero_title3: 'Commercial & Malls',
  lp_hero_subtitle: 'Every lease type. Every ownership structure. Every invoice — automated. Built for landlords who own and manage mixed use properties.',
  lp_hero_cta_demo: 'Book a Free Demo',
  lp_hero_cta_features: 'Explore Features →',
  lp_hero_float_title: 'Rent Escalation Applied',
  lp_hero_float_sub: '3 leases auto-renewed today',
  lp_trust_security: 'Bank-Grade Security',
  lp_trust_roles: 'Role-Based Access',
  lp_trust_cloud: 'Cloud · Accessible Anywhere',
  lp_trust_backups: 'Automatic Backups',
  lp_trust_dashboards: 'Real-Time Dashboards',
  lp_problems_badge: 'The Problem',
  lp_problems_title: "Sound Familiar? You're Not Alone.",
  lp_problems_subtitle: "Managing a property portfolio without the right tools is exhausting. Here's what landlords deal with every day.",
  lp_prob1_title: 'Scattered data in Excel & emails',
  lp_prob1_desc: 'No single view of your portfolio. Information lives in five different places and no one version is current.',
  lp_prob2_title: 'Complex ownership structures',
  lp_prob2_desc: "Joint ownership, family trusts and ESOPs create visibility gaps you simply can't afford.",
  lp_prob3_title: 'Manual rent revisions & invoices',
  lp_prob3_desc: 'Hours lost every month recreating invoices and chasing escalation schedules that should run themselves.',
  lp_prob4_title: 'Untracked maintenance requests',
  lp_prob4_desc: 'Delayed repairs mean unhappy tenants — and vacancies that cost you far more than the repair ever would.',
  lp_features_badge: 'Everything You Need',
  lp_features_title: 'All Your Leasing Milestones. One Platform.',
  lp_features_subtitle: 'From first key handover to final invoice — every workflow you need, built in from day one.',
  lp_feat1_title: 'Define Your Portfolio',
  lp_feat1_desc: 'Organise properties hierarchically — Project → Buildings → Floors → Units. No spreadsheet gymnastics.',
  lp_feat2_title: 'Classify Use Types',
  lp_feat2_desc: 'Tag units as Residential, Retail, Mall, or custom use types at any level of your hierarchy.',
  lp_feat3_title: 'Multi-Landlord Support',
  lp_feat3_desc: 'Register single or multiple landlords at any level of your property hierarchy with ease.',
  lp_feat4_title: 'Automate Rent Increases',
  lp_feat4_desc: 'Set escalation rules once and let Leazify apply them automatically — never miss an increase again.',
  lp_feat5_title: 'Auto Lease Renewal',
  lp_feat5_desc: 'Generate renewals automatically based on rules you define. Fewer missed deadlines, happier tenants.',
  lp_feat6_title: 'Invoice Generation',
  lp_feat6_desc: 'Create invoices for Rent, Service Charges and Security Deposits with a single click.',
  lp_feat7_title: 'Service & Maintenance',
  lp_feat7_desc: 'Tenants raise requests, you raise work orders. Service providers receive them seamlessly.',
  lp_feat8_title: 'Mall Turnover Rent',
  lp_feat8_desc: 'Record turnover and generate turnover rent invoices for retail and mall tenants effortlessly.',
  lp_usp_badge: 'Our Unique Advantage',
  lp_usp_title: 'Built for the Way Landlords Actually Work',
  lp_usp1_title: 'Zero-Ownership View Access',
  lp_usp1_item1: 'Ideal for family trusts, joint ownership and mortgaged properties',
  lp_usp1_item2: 'Beneficial owners see all milestones without edit rights',
  lp_usp1_item3: 'Transparency without compromising data security',
  lp_usp2_title: 'Flexible Tenant Agreements',
  lp_usp2_item1: 'Create tenants and co-tenants easily',
  lp_usp2_item2: 'Generate composite or individual tenancy agreements',
  lp_usp2_item3: 'Perfect for shared spaces, franchises and multi-party leases',
  lp_outcomes_badge: 'The Result',
  lp_outcomes_title: 'What Leazify Delivers for You',
  lp_outcome1: 'Better Cash Flow',
  lp_outcome2: 'Fewer Vacancies',
  lp_outcome3: 'Happier Tenants',
  lp_outcome4: 'Lower Operating Cost',
  lp_outcome5: 'Data-Driven Decisions',
  lp_cta_title: 'Take Control of Your Rentals Today',
  lp_cta_subtitle: "Join landlords who've moved from scattered spreadsheets to a single, transparent platform. Your portfolio — managed the way it deserves to be.",
  lp_cta_btn: 'Book a Free Demo',
  lp_footer_tagline: 'Complete leasing control for landlords — from first key to final invoice.',
  lp_footer_product: 'Product',
  lp_footer_contact: 'Contact',
  lp_footer_privacy: 'Privacy Policy',
  lp_footer_terms: 'Terms of Service',
  lp_footer_copyright: 'Leazify. All rights reserved.',
  lp_nav_challenges: 'Challenges',
  lp_nav_features: 'Features',
  lp_nav_why: 'Why Leazify',
  lp_nav_outcomes: 'Outcomes',
  lp_nav_contact: 'Contact',
  lp_nav_signin: 'Sign In',
  lp_nav_demo: 'Book a Demo',
  lp_modal_title: 'Book Your Free Demo',
  lp_modal_subtitle: "Share your details and we'll be in touch within one business day.",
  lp_modal_name: 'Your Name',
  lp_modal_name_placeholder: 'e.g. Ahmed Al Mansoori',
  lp_modal_email: 'Email Address',
  lp_modal_email_placeholder: 'you@example.com',
  lp_modal_phone: 'Mobile Number',
  lp_modal_phone_placeholder: '+971 50 123 4567',
  lp_modal_submit: 'Request My Free Demo →',
  lp_modal_submitting: 'Sending…',
  lp_modal_privacy: '🔒 Your details are safe with us. No spam, ever.',
  lp_modal_success_title: "You're all set!",
  lp_modal_success_desc: 'Thank you for your interest in Leazify. Our team will reach out shortly to schedule your personalised demo.',
  lp_modal_success_link: 'www.leazify.me',
  lp_modal_email_error: 'Please enter a valid email address.',
  lp_modal_phone_error: 'Please enter a valid mobile number.',
};
const ar: Translations = {
  nav_features: 'المميزات',
  nav_getStarted: 'ابدأ الآن',
  nav_signIn: 'تسجيل الدخول',
  nav_pricing: 'الأسعار',
  nav_about: 'عن المنصة',

// ── Move In / Move Out ──
mio_title: 'الدخول / الخروج',
mio_subtitle: 'قائمة تحقق الإيجار في دول الخليج — اختر وحدة للبدء',
mio_select_unit: 'اختر الوحدة',
mio_select_project: 'اختر المشروع...',
mio_select_building: 'اختر المبنى...',
mio_select_floor: 'اختر الطابق...',
mio_select_unit_option: 'اختر الوحدة...',
mio_status_move_in_recorded: 'الدخول ✓ مسجَّل',
mio_status_move_in_not: 'الدخول — غير مسجَّل',
mio_status_move_out_recorded: 'الخروج ✓ مسجَّل',
mio_status_move_out_not: 'الخروج — غير مسجَّل',
mio_both_recorded_title: 'تم تسجيل الدخول والخروج لهذه الوحدة.',
mio_both_recorded_desc: 'اختر وحدة أخرى لإنشاء سجل جديد.',
mio_checklist_move_in: 'قائمة تحقق الدخول',
mio_checklist_move_out: 'قائمة تحقق الخروج',
mio_items_completed: 'بنود مكتملة',
mio_date_move_in: 'تاريخ الدخول',
mio_date_move_out: 'تاريخ الخروج',
mio_date_placeholder: 'يوم-شهر-سنة',
mio_date_error: 'يرجى إدخال تاريخ صحيح بصيغة يوم-شهر-سنة',
mio_photos_videos: 'الصور ومقاطع الفيديو',
mio_upload_click: 'انقر أو اسحب للرفع',
mio_upload_hint: 'حتى 10 صور و2 مقاطع فيديو',
mio_notes: 'ملاحظات',
mio_notes_placeholder: 'أي ملاحظات أو مشاهدات إضافية...',
mio_save: 'حفظ القائمة',
mio_saving: 'جارٍ الحفظ...',
mio_save_success: 'تم حفظ القائمة بنجاح.',
mio_empty_title: 'اختر وحدة للبدء',
mio_empty_desc: 'اختر المشروع ← المبنى ← الطابق ← الوحدة لعرض أو إنشاء قائمة تحقق الدخول / الخروج.',
mio_of: 'من',

// Move In sections
mio_section_documents: 'المستندات والشؤون القانونية',
mio_section_utilities: 'الخدمات والمرافق',
mio_section_inspection: 'فحص العقار',
mio_section_practical: 'الإعداد العملي',

// Move In fields
mio_mi_tenancy_contract: 'عقد إيجار موقَّع (مسجَّل في الإيجاري بدبي / توثيق في أبوظبي)',
mio_mi_tenant_id: 'صور جوازات السفر والتأشيرة / الهوية الإماراتية لجميع المستأجرين',
mio_mi_cheques: 'تسليم الشيكات مؤجلة الصرف',
mio_mi_deposit: 'شيك الوديعة الأمنية',
mio_mi_dewa: 'تفعيل حساب ديوا / أدك / سيوا',
mio_mi_chiller: 'إعداد حساب التبريد المركزي',
mio_mi_internet: 'ترتيب باقة الإنترنت والتلفزيون',
mio_mi_access_card: 'الحصول على بطاقة الدخول للمبنى / تصريح المواقف',
mio_mi_amenity: 'استلام بطاقات الوصول للصالة الرياضية والمسبح والمرافق',
mio_mi_condition_report: 'تقرير حالة العقار الكامل موقَّع من المالك والمستأجر',
mio_mi_meter_readings: 'تسجيل قراءات العداد (كهرباء وماء وغاز)',
mio_mi_keys: 'إحصاء جميع المفاتيح والبطاقات والريموتات والتوقيع عليها',
mio_mi_ac: 'اختبار وحدات التكييف (مقسَّم ومركزي)',
mio_mi_water_heater: 'اختبار سخان المياه والغلاية',
mio_mi_appliances: 'اختبار جميع الأجهزة إن كانت الوحدة مفروشة',
mio_mi_pest: 'فحص وجود آفات أو عفن',
mio_mi_slot: 'تأكيد موعد الانتقال مع إدارة المبنى',
mio_mi_municipality: 'تأكيد رسوم البلدية',
mio_mi_insurance: 'ترتيب تأمين المستأجر',
mio_mi_emergency: 'حفظ جهات اتصال الصيانة الطارئة (المبنى والتكييف والسباكة)',

// Move Out sections
mio_section_notice: 'الإشعار والشؤون القانونية',
mio_section_mo_utilities: 'الخدمات والمرافق',
mio_section_handover: 'تسليم العقار',
mio_section_deposit: 'الوديعة والشؤون المالية',
mio_section_wrapup: 'الإجراءات الختامية',

// Move Out fields
mio_mo_notice: 'تقديم إشعار الإخلاء الخطي ضمن المهلة المحددة في العقد',
mio_mo_rera: 'تأكيد متطلبات إشعار ريرا / قانون الإيجار',
mio_mo_ejari: 'ترتيب إلغاء الإيجاري / التوثيق',
mio_mo_rent_settled: 'تأكيد تسوية الإيجار المستحق والشيكات',
mio_mo_bounced: 'حل أي مشكلات شيكات مرتجعة قبل المغادرة',
mio_mo_dewa: 'إغلاق حساب ديوا / أدك / سيوا وسداد الفاتورة النهائية',
mio_mo_chiller: 'إغلاق حساب التبريد المركزي',
mio_mo_internet: 'إلغاء عقد الإنترنت والتلفزيون أو نقله',
mio_mo_meter: 'تصوير قراءات العداد النهائية يوم الخروج',
mio_mo_municipality: 'تأكيد سداد رسوم البلدية والإسكان النهائية',
mio_mo_clean: 'إجراء تنظيف شامل للعقار',
mio_mo_ac: 'تنظيف فلاتر التكييف وصيانته',
mio_mo_damage: 'إصلاح الأضرار التي تتجاوز البلى الطبيعي',
mio_mo_keys: 'إعادة جميع المفاتيح والبطاقات والريموتات',
mio_mo_inspection: 'إجراء فحص مشترك عند الخروج مع المالك',
mio_mo_certificate: 'الحصول على شهادة التسليم الموقَّعة من المالك',
mio_mo_pest: 'شهادة مكافحة الآفات إن اشترطها العقد',
mio_mo_deposit_agreed: 'الاتفاق على جدول استرداد الوديعة الأمنية كتابياً',
mio_mo_deductions: 'طلب قائمة الاستقطاعات التفصيلية عند وجود أي اقتطاع',
mio_mo_dispute: 'رفع نزاع عبر مركز فض النزاعات الإيجارية التابع لريرا عند الحاجة',
mio_mo_cheques_returned: 'إعادة الشيكات مؤجلة الصرف أو تأكيد إلغائها',
mio_mo_mail: 'تحديث إعادة توجيه البريد / صندوق البريد',
mio_mo_address: 'تحديث العنوان لدى صاحب العمل والبنك والتأمين',
mio_mo_vehicle: 'تحديث عنوان تسجيل المركبة (هيئة الطرق والمواصلات / دائرة المرور)',
mio_mo_school: 'تحديث سجلات المدرسة والرعاية الصحية إن لزم',
mio_mo_slot: 'تأكيد موعد الانتقال وحجز المصعد',
  
  hero_badge: 'مبني لمديري العقارات والملاك في الإمارات',
  hero_title1: 'إدارة التأجير',
  hero_title2: 'ليزيفاي...',
  hero_subtitle: 'تجمع ليزيفاي محفظتك العقارية بالكامل تحت سقف واحد — الملكية الجزئية، عقود الإيجار المتعددة، الفوترة الجماعية، تجديد عقود الإيجار، وطلبات الخدمة الشاملة. لا جداول بيانات. لا تجديدات فائتة.',
  hero_cta_interest: 'أبدِ اهتمامك كمالك عقار',
  hero_cta_signin: 'تسجيل الدخول إلى بوابتك',

  stat_uptime: '99.9%',
  stat_currency: 'درهم',
  stat_lease: '< دقيقتين',
  stat_portal: '24/7',
  stat_uptime_label: 'ضمان التشغيل',
  stat_currency_label: 'العملة الأصلية',
  stat_lease_label: 'متوسط إنشاء العقد',
  stat_portal_label: 'الوصول للبوابة',

  usp_badge: 'لماذا ليزيفاي',
  usp_title: 'مبني لتعقيدات التأجير',
  usp_subtitle: 'من هياكل الملكية الجزئية إلى الامتثال لقانون الإيجار في دبي — تتعامل ليزيفاي مع ما لا تستطيع برامج العقارات العامة التعامل معه.',

  usp_fractional_title: 'الملكية الجزئية وتعدد الملاك',
  usp_fractional_desc: 'يمكن أن تمتلك عقاراً واحداً عدة ملاك بحصص محددة. تتتبع ليزيفاي حصة كل مالك مشارك، وتوزع الدخل بشكل تناسبي، وتبقي كل مالك على اطلاع دائم.',
  usp_tenants_title: 'تعدد المستأجرين وفق قوانين دبي',
  usp_tenants_desc: 'دعم للمستأجر الرئيسي والمستأجرين المشاركين في عقد إيجار واحد، متوافق تماماً مع قانون الإيجار في دبي. وثائق جاهزة للإيجاري وسير عمل متوافق مع ريرا.',
  usp_bulk_title: 'الفوترة الجماعية على نطاق واسع',
  usp_bulk_desc: 'أنشئ مئات فواتير الإيجار والصيانة والودائع بنقرة واحدة. أرسل التذكيرات دفعةً واحدة، وتتبع المدفوعات المتأخرة، وسوِّ الشيكات — كل ذلك دون جهد يدوي.',
  usp_renewals_title: 'تجديد عقود الإيجار التلقائي',
  usp_renewals_desc: 'لا تفوّت أي موعد تجديد. تتتبع ليزيفاي تواريخ الانتهاء، وتُطلق سير عمل الموافقة، وتُخطر المستأجرين، وتتيح لك التجديد بشروط محدّثة في دقائق.',
  usp_service_title: 'طلبات الخدمة الشاملة',
  usp_service_desc: 'يقدم المستأجرون الطلبات مباشرةً من بوابتهم. عيِّن مزودي الخدمة، وتتبع التقدم، وأدر عروض الأسعار، وأغلق أوامر العمل — من البداية إلى النهاية في منصة واحدة.',
  usp_compliance_title: 'الامتثال التنظيمي في الإمارات',
  usp_compliance_desc: 'عملة الدرهم الأصلية، وتنسيقات الهاتف الإماراتية، ووثائق إيجار جاهزة للإيجاري، وسير عمل متوافق مع ريرا. مبني من الصفر لسوق الإمارات.',

  features_badge: 'إمكانيات المنصة',
  features_title: 'كل ما تحتاجه لإدارة محفظتك العقارية',
  features_subtitle: 'من وحدة واحدة إلى محفظة متعددة المباني — تتوسع ليزيفاي مع أعمالك وتبقي كل أصحاب المصلحة على اطلاع دائم.',

  feat_hierarchy_title: 'هيكل عقاري متعدد المستويات',
  feat_hierarchy_desc: 'أدر المشاريع والمباني والطوابق والوحدات في هيكل منظم. حدد أنواع الاستخدام وحدود الطوابق وطاقات الوحدات مع التطبيق الكامل.',
  feat_lease_title: 'إدارة عقود الإيجار الذكية',
  feat_lease_desc: 'أنشئ عقود إيجار مع المستأجرين الرئيسيين والمشاركين، وأنشئ العقود تلقائياً، وتتبع التجديدات، وأدر حالة العقد من المسودة حتى الانتهاء. أضف بسهولة عقوداً متعددة السنوات مع زيادة سنوية في الإيجار.',
  feat_invoicing_title: 'الفوترة الآلية',
  feat_invoicing_desc: 'أنشئ فواتير الإيجار والصيانة والودائع الأمنية تلقائياً. تتبع حالة الدفع، وأرسل التذكيرات، واحتفظ بمسار تدقيق مالي كامل.',
  feat_receipts_title: 'الإيصالات والتسوية البنكية',
  feat_receipts_desc: 'سجّل المدفوعات بالشيك أو التحويل البنكي أو عبر الإنترنت. وحدة تسوية الشيكات المدمجة تحافظ على دقة سجلاتك المالية.',
  feat_maintenance_title: 'الصيانة وأوامر العمل',
  feat_maintenance_desc: 'سجّل طلبات الصيانة، وعيِّن مزودي الخدمة، وتتبع تقدم أوامر العمل، وأدر عقود الصيانة — كل ذلك في مكان واحد.',
  feat_roles_title: 'التحكم في الوصول متعدد الأدوار',
  feat_roles_desc: 'صلاحيات دقيقة قائمة على الأدوار للموظفين. حدد أدواراً مخصصة مع وصول محدد للوحدات والوظائف الفرعية وأدوات لوحة التحكم لكل مستخدم.',
  feat_analytics_title: 'التحليلات والتقارير',
  feat_analytics_desc: 'معدلات الإشغال في الوقت الفعلي، ومخططات تحصيل الإيجار، وتنبيهات عقود الإيجار المنتهية، ومؤشرات الأداء الرئيسية على مستوى المحفظة — كل ذلك في لوحة تحكم واحدة.',
  feat_portals_title: 'بوابات المستأجر ومزود الخدمة',
  feat_portals_desc: 'بوابات خدمة ذاتية مخصصة للمستأجرين لعرض العقود والفواتير، ولمزودي الخدمة لتقديم عروض الأسعار وإدارة أوامر العمل.',
  feat_renewal_title: 'سير عمل تجديد عقد الإيجار',
  feat_renewal_desc: 'تتبع التجديد التلقائي مع سير عمل الموافقة. أخطر المستأجرين، وتفاوض على الشروط، وجدد العقود بدون تفويت أي موعد نهائي.',
  feat_bulk_title: 'الإعداد الجماعي',
  feat_bulk_desc: 'استورد العقارات والمستأجرين وعقود الإيجار بشكل جماعي عبر CSV. أعدّ محفظتك بالكامل في دقائق لا أسابيع.',
  feat_audit_title: 'مسار تدقيق كامل',
  feat_audit_desc: 'يتم تسجيل كل إجراء — من فعل ماذا ومتى. سجلات تدقيق كاملة للامتثال وحل النزاعات والشفافية التشغيلية.',
  feat_uae_title: 'متوافق مع الإمارات وآمن',
  feat_uae_desc: 'مبني لعقارات الإمارات بعملة الدرهم وتنسيقات الهاتف المحلية وأفضل ممارسات أمن البيانات. بياناتك تبقى ملكك.',
  feat_turnover_title: 'إيجار التبادل',
  feat_turnover_desc: 'حمِّل بيانات المبيعات الشهرية لمستأجريك وأنشئ فواتير إيجار التبادل بسلاسة.',

  building_type_band_label: 'مبني لكل أنواع المباني',
  building_type_residential: 'المباني السكنية',
  building_type_commercial: 'المباني التجارية',
  building_type_mixed: 'المباني متعددة الاستخدام',
  building_type_malls: 'المراكز التجارية',

  portals_badge: 'الوصول القائم على الأدوار',
  portals_title: 'منصة واحدة، ثلاث بوابات',
  portals_subtitle: 'يحصل كل أصحاب المصلحة على تجربة مخصصة — لا فوضى، فقط ما يحتاجونه.',
  portal_landlord_title: 'المالك / الموظف',
  portal_tenant_title: 'بوابة المستأجر',
  portal_provider_title: 'مزود الخدمة',
  portal_landlord_1: 'لوحة تحكم المحفظة الكاملة',
  portal_landlord_2: 'إدارة العقود والفواتير',
  portal_landlord_3: 'الإشراف على أوامر العمل',
  portal_landlord_4: 'التحليلات والتقارير',
  portal_landlord_5: 'وصول الموظفين القائم على الأدوار',
  portal_tenant_1: 'عرض عقود الإيجار النشطة',
  portal_tenant_2: 'تنزيل العقود',
  portal_tenant_3: 'تتبع الفواتير والمدفوعات',
  portal_tenant_4: 'تقديم طلبات الخدمة',
  portal_tenant_5: 'سجل المدفوعات',
  portal_provider_1: 'تصفح الطلبات المفتوحة',
  portal_provider_2: 'تقديم عروض أسعار تنافسية',
  portal_provider_3: 'إدارة أوامر العمل',
  portal_provider_4: 'تتبع الأرباح',
  portal_provider_5: 'تنزيل الفواتير',

  interest_badge: 'للملاك الجدد',
  interest_title: 'هل أنت مستعد لنقل محفظتك إلى الإنترنت؟',
  interest_subtitle: 'سواء كنت تدير وحدتين أو 200 وحدة، يمكن إعداد ليزيفاي وتشغيله في يوم واحد. أبدِ اهتمامك وسيتواصل معك فريقنا لجدولة جولة تعريفية مخصصة.',
  interest_benefit_1: 'استشارة إعداد مجانية',
  interest_benefit_2: 'ترحيل البيانات من جداول البيانات',
  interest_benefit_3: 'دعم إعداد مخصص',
  interest_benefit_4: 'تدريب لفريقك',
  interest_contact_label: 'تواصل مباشر',
  form_name: 'الاسم الكامل',
  form_name_placeholder: 'أحمد الراشدي',
  form_email: 'البريد الإلكتروني',
  form_email_placeholder: 'ahmed@example.com',
  form_phone: 'رقم الهاتف',
  form_phone_placeholder: '+971 50 123 4567',
  form_company: 'الشركة / الاسم التجاري',
  form_company_placeholder: 'شركة الراشدي للعقارات',
  form_portfolio: 'حجم المحفظة',
  form_portfolio_placeholder: 'اختر عدد الوحدات',
  form_message: 'رسالة (اختياري)',
  form_message_placeholder: 'أخبرنا عن محفظتك والتحديات الحالية أو أي متطلبات محددة...',
  form_submit: 'أبدِ اهتمامي',
  form_submitting: 'جارٍ الإرسال...',
  form_privacy: 'معلوماتك خاصة ولن تُشارك مع أي طرف.',
  form_success_title: 'شكراً لك',
  form_success_desc: 'لقد تلقينا اهتمامك وسنتواصل معك خلال 24 ساعة لجدولة عرض توضيحي مخصص.',
  form_error_required: 'الاسم والبريد الإلكتروني مطلوبان.',
  form_error_generic: 'حدث خطأ ما. يرجى المحاولة مرة أخرى أو مراسلتنا مباشرة.',
  form_title: 'أبدِ اهتمامك',
  form_subtitle: 'أدخل بياناتك وسنتواصل معك خلال 24 ساعة.',

  footer_tagline: '· منصة إدارة العقارات في الإمارات',
  footer_contact: 'تواصل معنا',
  footer_copyright: 'ليزيفاي',

// ── Landing Page ──
lp_badge: 'منصة ذكية واحدة',
lp_hero_title1: 'برنامج إدارة الإيجارات لـ',
lp_hero_title2: 'السكني والتجاري',
lp_hero_title3: 'التجاري والمراكز التجارية',
lp_hero_subtitle: 'كل نوع إيجار. كل هيكل ملكية. كل فاتورة — بشكل تلقائي. مبني للملاك الذين يمتلكون ويديرون عقارات متعددة الاستخدام.',
lp_hero_cta_demo: 'احجز عرضاً تجريبياً مجانياً',
lp_hero_cta_features: 'استكشف المميزات →',
lp_hero_float_title: 'تم تطبيق زيادة الإيجار',
lp_hero_float_sub: 'تم تجديد 3 عقود اليوم تلقائياً',
lp_trust_security: 'أمان بمستوى البنوك',
lp_trust_roles: 'وصول قائم على الأدوار',
lp_trust_cloud: 'سحابي · متاح في أي مكان',
lp_trust_backups: 'نسخ احتياطي تلقائي',
lp_trust_dashboards: 'لوحات تحكم فورية',
lp_problems_badge: 'المشكلة',
lp_problems_title: 'هل هذا مألوف لك؟ لست وحدك.',
lp_problems_subtitle: 'إدارة محفظة عقارية بدون الأدوات المناسبة أمر مُرهق. إليك ما يواجهه الملاك كل يوم.',
lp_prob1_title: 'بيانات مشتتة في Excel والبريد الإلكتروني',
lp_prob1_desc: 'لا توجد رؤية موحدة لمحفظتك. المعلومات موزعة في خمسة أماكن مختلفة ولا توجد نسخة واحدة محدَّثة.',
lp_prob2_title: 'هياكل ملكية معقدة',
lp_prob2_desc: 'الملكية المشتركة والصناديق العائلية والإيسوب تخلق فجوات في الرؤية لا يمكنك تحمّلها.',
lp_prob3_title: 'مراجعة الإيجارات والفواتير يدوياً',
lp_prob3_desc: 'ساعات تضيع كل شهر في إعادة إنشاء الفواتير ومتابعة جداول الزيادة التي يجب أن تعمل تلقائياً.',
lp_prob4_title: 'طلبات صيانة غير متابعة',
lp_prob4_desc: 'التأخر في الإصلاحات يعني مستأجرين غير راضين — وشواغر تكلفك أكثر بكثير من تكلفة الإصلاح.',
lp_features_badge: 'كل ما تحتاجه',
lp_features_title: 'جميع مراحل إيجارك. منصة واحدة.',
lp_features_subtitle: 'من تسليم أول مفتاح إلى الفاتورة الأخيرة — كل سير عمل تحتاجه، مدمج من اليوم الأول.',
lp_feat1_title: 'حدد محفظتك العقارية',
lp_feat1_desc: 'نظّم العقارات هرمياً — مشروع ← مباني ← طوابق ← وحدات. بدون تعقيدات جداول البيانات.',
lp_feat2_title: 'صنّف أنواع الاستخدام',
lp_feat2_desc: 'صنّف الوحدات كسكنية أو تجارية أو مول أو أنواع مخصصة على أي مستوى من هيكلك.',
lp_feat3_title: 'دعم تعدد الملاك',
lp_feat3_desc: 'سجّل مالكاً واحداً أو متعددين على أي مستوى من هيكل عقارك بسهولة.',
lp_feat4_title: 'أتمتة زيادات الإيجار',
lp_feat4_desc: 'حدد قواعد الزيادة مرة واحدة ودع ليزيفاي يطبقها تلقائياً — لا تفوّت زيادة بعد الآن.',
lp_feat5_title: 'تجديد العقود تلقائياً',
lp_feat5_desc: 'أنشئ التجديدات تلقائياً بناءً على القواعد التي تحددها. مواعيد نهائية أقل فوتاً ومستأجرون أكثر سعادة.',
lp_feat6_title: 'إنشاء الفواتير',
lp_feat6_desc: 'أنشئ فواتير الإيجار ورسوم الخدمة والودائع الأمنية بنقرة واحدة.',
lp_feat7_title: 'الخدمة والصيانة',
lp_feat7_desc: 'يرفع المستأجرون الطلبات، وأنت ترفع أوامر العمل. يستلمها مزودو الخدمة بسلاسة.',
lp_feat8_title: 'إيجار تبادل المول',
lp_feat8_desc: 'سجّل المبيعات وأنشئ فواتير إيجار التبادل لمستأجري التجزئة والمولات بسهولة.',
lp_usp_badge: 'ميزتنا الفريدة',
lp_usp_title: 'مبني بالطريقة التي يعمل بها الملاك فعلاً',
lp_usp1_title: 'وصول المشاهدة بدون ملكية',
lp_usp1_item1: 'مثالي للصناديق العائلية والملكية المشتركة والعقارات المرهونة',
lp_usp1_item2: 'يرى المالكون المستفيدون جميع المراحل بدون صلاحيات تعديل',
lp_usp1_item3: 'شفافية دون المساس بأمن البيانات',
lp_usp2_title: 'اتفاقيات إيجار مرنة',
lp_usp2_item1: 'أنشئ مستأجرين ومستأجرين مشاركين بسهولة',
lp_usp2_item2: 'أنشئ اتفاقيات إيجار مركّبة أو فردية',
lp_usp2_item3: 'مثالي للمساحات المشتركة والامتيازات والعقود متعددة الأطراف',
lp_outcomes_badge: 'النتيجة',
lp_outcomes_title: 'ما تقدمه ليزيفاي لك',
lp_outcome1: 'تدفق نقدي أفضل',
lp_outcome2: 'شواغر أقل',
lp_outcome3: 'مستأجرون أكثر سعادة',
lp_outcome4: 'تكاليف تشغيل أقل',
lp_outcome5: 'قرارات مبنية على البيانات',
lp_cta_title: 'تحكم في إيجاراتك اليوم',
lp_cta_subtitle: 'انضم إلى الملاك الذين انتقلوا من جداول البيانات المشتتة إلى منصة واحدة شفافة. محفظتك — مُدارة بالطريقة التي تستحقها.',
lp_cta_btn: 'احجز عرضاً تجريبياً مجانياً',
lp_footer_tagline: 'تحكم كامل في الإيجار للملاك — من أول مفتاح إلى آخر فاتورة.',
lp_footer_product: 'المنصة',
lp_footer_contact: 'تواصل معنا',
lp_footer_privacy: 'سياسة الخصوصية',
lp_footer_terms: 'شروط الخدمة',
lp_footer_copyright: 'ليزيفاي. جميع الحقوق محفوظة.',
lp_nav_challenges: 'التحديات',
lp_nav_features: 'المميزات',
lp_nav_why: 'لماذا ليزيفاي',
lp_nav_outcomes: 'النتائج',
lp_nav_contact: 'تواصل',
lp_nav_signin: 'تسجيل الدخول',
lp_nav_demo: 'احجز عرضاً',
lp_modal_title: 'احجز عرضك التجريبي المجاني',
lp_modal_subtitle: 'شاركنا تفاصيلك وسنتواصل معك خلال يوم عمل واحد.',
lp_modal_name: 'اسمك',
lp_modal_name_placeholder: 'مثال: أحمد المنصوري',
lp_modal_email: 'البريد الإلكتروني',
lp_modal_email_placeholder: 'you@example.com',
lp_modal_phone: 'رقم الجوال',
lp_modal_phone_placeholder: '+971 50 123 4567',
lp_modal_submit: 'اطلب عرضي التجريبي المجاني →',
lp_modal_submitting: 'جارٍ الإرسال...',
lp_modal_privacy: '🔒 تفاصيلك في أمان معنا. لا رسائل غير مرغوب فيها أبداً.',
lp_modal_success_title: 'تم بنجاح!',
lp_modal_success_desc: 'شكراً لاهتمامك بليزيفاي. سيتواصل فريقنا معك قريباً لجدولة عرضك التجريبي المخصص.',
lp_modal_success_link: 'www.leazify.me',
lp_modal_email_error: 'يرجى إدخال بريد إلكتروني صحيح.',
lp_modal_phone_error: 'يرجى إدخال رقم جوال صحيح.',
  
  sidebar_dashboard: 'لوحة التحكم',
  sidebar_landlord_dashboard: 'لوحة تحكم المالك',
  sidebar_property: 'إدارة العقارات',
  sidebar_assignment: 'تعيين المشاريع',
  sidebar_leasing: 'الإيجار',
  sidebar_renewals: 'تجديد العقود',
  sidebar_move_in_out: 'الدخول / الخروج',
  sidebar_invoicing: 'الفوترة',
  sidebar_receipts: 'الإيصالات',
  sidebar_communications: 'المراسلات',
  sidebar_tenant_portal: 'بوابة المستأجر',
  sidebar_provider_portal: 'بوابة مزود الخدمة',
  sidebar_maintenance: 'الصيانة',
  sidebar_workorders: 'أوامر العمل',
  sidebar_masterdata: 'البيانات الرئيسية',
  sidebar_bulk: 'الإعداد الجماعي',
  sidebar_reports: 'التقارير',
  sidebar_analytics: 'التحليلات',
  sidebar_audit_log: 'سجل التدقيق',
  sidebar_staff_assignments: 'تعيينات الموظفين',
  sidebar_settings: 'الإعدادات',
  sidebar_notifications: 'الإشعارات',
  sidebar_group_portfolio: 'المحفظة',
  sidebar_group_operations: 'العمليات',
  sidebar_group_admin: 'الإدارة',

  auth_title: 'إدارة عقارات ذكية لملاك الإمارات',
  auth_subtitle: 'أدر محفظتك بالكامل — العقود والفواتير والصيانة والمستأجرين — من منصة واحدة قوية.',
  auth_feature_1: 'إدارة هيكل عقاري متعدد المستويات',
  auth_feature_2: 'إنشاء عقود وفواتير تلقائي',
  auth_feature_3: 'بوابات المستأجر ومزود الخدمة',
  auth_feature_4: 'لوحات تحليلات ومؤشرات أداء في الوقت الفعلي',
  auth_feature_5: 'التحكم في الوصول القائم على الأدوار للموظفين',
  auth_feature_6: 'تسوية الشيكات والإيصالات',
  auth_copyright: '© ليزيفاي · منصة إدارة العقارات في الإمارات',
  login_title: 'تسجيل الدخول إلى ليزيفاي',
  login_subtitle: 'الوصول إلى بوابتك بناءً على دورك',
  login_email: 'البريد الإلكتروني',
  login_password: 'كلمة المرور',
  login_submit: 'تسجيل الدخول',
  login_submitting: 'جارٍ تسجيل الدخول...',
  login_portal_label: 'الوصول إلى البوابة',
  login_portal_landlord: 'المالك / الموظف ← لوحة تحكم الإدارة',
  login_portal_tenant: 'المستأجر ← بوابة العقود والفواتير',
  login_portal_provider: 'مزود الخدمة ← بوابة أوامر العمل',

  dash_greeting_morning: 'صباح الخير',
  dash_greeting_afternoon: 'مساء الخير',
  dash_greeting_evening: 'مساء النور',
  dash_portfolio_overview: 'نظرة عامة على المحفظة',
  dash_live: 'مباشر',
  dash_refresh: 'تحديث',
  dash_analytics: 'التحليلات',
  dash_add_property: 'إضافة عقار',

  kpi_portfolio_occupancy: 'إشغال المحفظة',
  kpi_units_occupied: 'وحدة مشغولة',
  kpi_view_properties: 'عرض العقارات',
  kpi_revenue_collected: 'الإيرادات المحصّلة',
  kpi_collection_rate: 'معدل التحصيل',
  kpi_active_leases: 'عقود الإيجار النشطة',
  kpi_expiring_label: 'تنتهي قريباً',
  kpi_expire_30: 'تنتهي خلال 30 يوماً',
  kpi_all_current: 'جميع العقود سارية',
  kpi_rent_outstanding: 'الإيجار المستحق',
  kpi_action_needed: 'يتطلب إجراء',
  kpi_invoices_overdue: 'فواتير متأخرة',
  kpi_invoice_overdue_single: 'فاتورة متأخرة',
  kpi_amc_outstanding: 'صيانة مستحقة',
  kpi_overdue: 'متأخر',
  kpi_work_orders: 'أوامر العمل المفتوحة',
  kpi_unassigned: 'غير مُعيَّن',
  kpi_need_assignment: 'تحتاج تعيين',
  kpi_all_resolved: 'تم الحل',
  kpi_service_requests: 'طلبات الخدمة',
  kpi_pending_resolution: 'في انتظار الحل',
  kpi_security_deposits: 'الودائع الأمنية',
  kpi_active_leases_count: 'عقود إيجار نشطة',
  kpi_expiring_30_days: 'تنتهي خلال 30 يوماً',
  kpi_no_expiring: 'لا توجد عقود تنتهي قريباً',
  kpi_require_renewal: 'تتطلب إجراء تجديد',
  kpi_renew: 'تجديد',

  qa_title: 'إجراءات سريعة',
  qa_new_lease: 'عقد جديد',
  qa_invoicing: 'الفوترة',
  qa_receipts: 'الإيصالات',
  qa_work_orders: 'أوامر العمل',
  qa_renewals: 'التجديدات',
  qa_properties: 'العقارات',
  qa_staff: 'الموظفون',
  qa_reports: 'التقارير',

  af_title: 'النشاط الأخير',
  af_subtitle: 'أحداث المحفظة — آخر الإجراءات',
  af_no_activity: 'لم يُسجَّل أي نشاط بعد',
  af_action_created: 'جديد',
  af_action_updated: 'تم التحديث',
  af_action_deleted: 'تم الحذف',
  af_action_paid: 'تم استلام الدفعة',
  af_action_approved: 'تمت الموافقة',
  af_action_rejected: 'تم الرفض',
  af_action_closed: 'تم الإغلاق',
  af_action_resolved: 'تم الحل',
  af_action_cancelled: 'تم الإلغاء',
  af_just_now: 'الآن',
  af_minutes_ago: 'د مضت',
  af_hours_ago: 'س مضت',
  af_days_ago: 'ي مضت',

  elt_title: 'العقود المنتهية قريباً',
  elt_subtitle_loading: 'جارٍ التحميل...',
  elt_subtitle_none: 'لا توجد عقود تنتهي خلال 30 يوماً',
  elt_subtitle_count: 'تتطلب إجراء تجديد',
  elt_view_all: 'عرض الكل',
  elt_col_unit: 'الوحدة',
  elt_col_building: 'المبنى',
  elt_col_tenant: 'المستأجر',
  elt_col_lease_end: 'نهاية العقد',
  elt_col_urgency: 'الأولوية',
  elt_col_rent: 'الإيجار الشهري',
  elt_renew: 'تجديد',
  elt_no_expiring: 'لا توجد عقود تنتهي خلال 30 يوماً',
  elt_days_left: 'يوم متبقٍ',

  rcc_title: 'اتجاه تحصيل الإيجار',
  rcc_subtitle: 'المحصَّل مقابل المُفوتَر — آخر 6 أشهر',
  rcc_collected: 'المحصَّل',
  rcc_invoiced: 'المُفوتَر',
  rcc_no_data: 'لا توجد بيانات فواتير بعد',
  rcc_collection_rate: 'معدل التحصيل',

  opc_title: 'الإشغال حسب المشروع',
  opc_subtitle: 'نسبة الوحدات المؤجَّرة الحالية',
  opc_no_data: 'لا توجد بيانات مشاريع بعد',
  opc_occupancy: 'الإشغال',
  opc_units: 'الوحدات',

  lang_en: 'English',
  lang_ar: 'العربية',

  btn_cancel: 'إلغاء',
  btn_save: 'حفظ',
  btn_saving: 'جارٍ الحفظ...',
  btn_submit: 'إرسال',
  btn_submitting: 'جارٍ الإرسال...',
  btn_refresh: 'تحديث',
  btn_retry: 'إعادة المحاولة',
  btn_search: 'بحث',
  btn_download_pdf: 'تحميل PDF',
  btn_generate: 'توليد',
  btn_generating: 'جارٍ التوليد...',
  btn_approve: 'موافقة',
  btn_reject: 'رفض',
  btn_view: 'عرض',
  btn_pay: 'دفع',
  btn_back: 'رجوع',
  lbl_project: 'المشروع',
  lbl_building: 'المبنى',
  lbl_floor: 'الطابق',
  lbl_unit: 'الوحدة',
  lbl_all_projects: 'جميع المشاريع',
  lbl_all_buildings: 'جميع المباني',
  lbl_all_floors: 'جميع الطوابق',
  lbl_all_units: 'جميع الوحدات',
  lbl_select_project: 'اختر المشروع',
  lbl_select_building: 'اختر المبنى',
  lbl_select_floor: 'اختر الطابق',
  lbl_select_unit: 'اختر الوحدة',
  lbl_status: 'الحالة',
  lbl_actions: 'الإجراءات',
  lbl_date: 'التاريخ',
  lbl_notes: 'ملاحظات',
  lbl_all: 'الكل',
  lbl_loading: 'جارٍ التحميل...',
  lbl_no_data: 'لا توجد بيانات متاحة',
  lbl_period: 'الفترة',
  lbl_amount: 'المبلغ',
  lbl_total: 'الإجمالي',
  lbl_type: 'النوع',
  lbl_name: 'الاسم',
  lbl_description: 'الوصف',
  lbl_priority: 'الأولوية',
  lbl_provider: 'مزود الخدمة',
  lbl_unassigned: 'غير مُعيَّن',
  lbl_tenant: 'المستأجر',
  lbl_lessee: 'المستأجر',
  lbl_annual_rent: 'إيجار سنوي',
  lbl_security_deposit: 'وديعة أمان',
  lbl_payment_term: 'شروط الدفع',
  lbl_period_label: 'الفترة',
  lbl_lease_number: 'رقم العقد',
  lbl_unit_label: 'الوحدة',
  lbl_building_floor: 'المبنى / الطابق',
  lbl_skill_type: 'نوع المهارة',
  lbl_charge: 'الرسوم',
  lbl_quotes: 'عروض الأسعار',
  lbl_select_skill: 'اختر المهارة',
  lbl_select_provider: 'اختر مزود الخدمة (اختياري)',
  lbl_optional: 'اختياري',
  lbl_required: 'مطلوب',
  lbl_aed: 'درهم',

  pt_immediate: 'يُدفع فوراً',
  pt_15_days: '15 يوماً',
  pt_30_days: '30 يوماً',
  pt_quarterly: 'ربع سنوي',
  pt_half_yearly: 'نصف سنوي',
  pt_annually: 'سنوي',

  leasing_title: 'إدارة العقود',
  leasing_subtitle: 'إدارة جميع عقود الإيجار والتجديدات والتعيينات',
  leasing_new_lease: 'عقد جديد',
  leasing_search_placeholder: 'البحث عن العقود والمستأجرين والوحدات...',
  leasing_col_lease_no: 'رقم العقد',
  leasing_col_unit: 'الوحدة',
  leasing_col_building_floor: 'المبنى / الطابق',
  leasing_col_lessee: 'المستأجر',
  leasing_col_annual_rent: 'إيجار سنوي',
  leasing_col_sd: 'وديعة أمان',
  leasing_col_payment_term: 'شروط الدفع',
  leasing_col_period: 'الفترة',
  leasing_col_status: 'الحالة',
  leasing_col_actions: 'الإجراءات',
  leasing_empty_title: 'لم يتم العثور على عقود',
  leasing_empty_desc: 'أنشئ أول عقد إيجار للبدء',
  leasing_modal_title: 'عقد إيجار جديد',
  leasing_modal_subtitle: 'إنشاء عقد إيجار لوحدة',
  leasing_section_property: 'اختيار العقار',
  leasing_section_tenant: 'تفاصيل المستأجر',
  leasing_section_period: 'فترة العقد',
  leasing_section_financial: 'الشروط المالية',
  leasing_main_tenant: 'المستأجر الرئيسي',
  leasing_co_tenant: 'المستأجر المشارك',
  leasing_add_co_tenant: 'إضافة مستأجر مشارك',
  leasing_tenant_count: 'مستأجر(ون) على هذا العقد',
  leasing_lease_duration: 'مدة العقد',
  leasing_lease_amount: 'قيمة العقد (سنوي)',
  leasing_annual_increment: 'نسبة الزيادة السنوية في الإيجار %',
  leasing_annual_increment_note: 'مدة العقد تتجاوز سنة واحدة',
  leasing_turnover_rent: 'إيجار التبادل %',
  leasing_to_payment_term: 'شروط دفع إيجار التبادل',
  leasing_amc: 'رسوم الصيانة السنوية',
  leasing_amc_payment_term: 'شروط دفع الصيانة',
  leasing_sd_payment_term: 'شروط دفع الوديعة',
  leasing_create_btn: 'إنشاء العقد وتوليد الاتفاقية',
  leasing_detail_title: 'تفاصيل عقد الإيجار',
  leasing_detail_subtitle: 'تفاصيل عقد الإيجار',
  leasing_download_contract: 'تحميل العقد',
  leasing_update_status: 'تحديث الحالة',
  leasing_co_tenant_error: 'يرجى تحديد شخص لكل مستأجر مشارك',
  leasing_duplicate_error: 'لا يمكن أن يكون الشخص نفسه مستأجراً رئيسياً ومشاركاً في آنٍ واحد',
  leasing_tenant_paid: 'هذا الطلب مدفوع من المستأجر.',
  leasing_landlord_paid: 'هذا الطلب مدفوع من المالك.',

  inv_title: 'الفوترة والمالية',
  inv_subtitle: 'توليد فواتير ضريبة القيمة المضافة من بيانات العقود — الإيجار والودائع والصيانة وإيجار التبادل',
  inv_vat_config: 'تكوين ضريبة القيمة المضافة',
  inv_sidebar_all: 'جميع الفواتير',
  inv_sidebar_all_desc: 'عرض وتعديل جميع الفواتير',
  inv_sidebar_lease: 'إيجار وودائع',
  inv_sidebar_lease_desc: 'توليد فواتير الإيجار والودائع من العقود النشطة',
  inv_sidebar_amc: 'فاتورة الصيانة السنوية',
  inv_sidebar_amc_desc: 'توليد فواتير الصيانة السنوية للعقود النشطة',
  inv_sidebar_turnover: 'فاتورة إيجار التبادل',
  inv_sidebar_turnover_desc: 'قم بتحميل بيانات المبيعات وتوليد فواتير إيجار التبادل',
  inv_sidebar_bulk: 'إنشاء فواتير جماعي',
  inv_sidebar_bulk_desc: 'توليد جماعي للفواتير لعدد كبير من العقود مع مراجعة',
  inv_creation_label: 'إنشاء الفاتورة',
  inv_vat_modal_title: 'تكوين ضريبة القيمة المضافة',
  inv_vat_modal_subtitle: 'تعيين معدلات ضريبة القيمة المضافة لكل مشروع',
  inv_vat_number: 'رقم تسجيل ضريبة القيمة المضافة',
  inv_vat_rates: 'معدلات ضريبة القيمة المضافة (%)',
  inv_vat_rent: 'معدل ضريبة الإيجار',
  inv_vat_sd: 'معدل ضريبة وديعة الأمان',
  inv_vat_turnover: 'معدل ضريبة إيجار التبادل',
  inv_vat_amc: 'معدل ضريبة الصيانة',
  inv_vat_misc: 'معدل ضريبة متنوع',
  inv_save_vat: 'حفظ تكوين ضريبة القيمة المضافة',
  inv_select_project: 'اختر المشروع',
  inv_hierarchy_label: 'اختر مستوى الهيكل',
  inv_invoice_type: 'نوع الفاتورة *',
  inv_due_date: 'تاريخ الاستحقاق',
  inv_period_start: 'تاريخ البداية',
  inv_period_end: 'تاريخ النهاية',
  inv_find_leases: 'البحث عن العقود النشطة',
  inv_loading_leases: 'جارٍ تحميل العقود...',
  inv_lease_invoice_title: 'توليد فواتير الإيجار والوديعة الأمنية',
  inv_lease_invoice_desc: 'اختر مستوى في هيكل المشروع. سيتم توليد الفواتير لجميع العقود النشطة ضمن الاختيار التي لم تُفوتَر بعد.',
  inv_amc_title: 'توليد فواتير الصيانة السنوية',
  inv_amc_desc: 'اختر مستوى في هيكل المشروع. سيتم توليد فواتير الصيانة لجميع العقود النشطة التي تشمل مبلغ صيانة ولم تُفوتَر بعد.',
  inv_turnover_title: 'توليد فواتير إيجار التبادل',
  inv_turnover_desc: 'اختر الهيكل والشهر، حمّل نموذج CSV لوحدات المول، أدخل بيانات المبيعات، ارفع الملف وراجعه، ثم أنشئ الفواتير للوحدات المحددة.',
  inv_bulk_title: 'إنشاء فواتير جماعي',
  inv_bulk_desc: 'اختر مستوى الهيكل ونوع الاستخدام. أدخل نسب المراجعة لكل عقد، ثم أنشئ الفواتير جماعياً لجميع العقود المعلقة.',
  inv_rent_invoice: 'فاتورة إيجار',
  inv_sd_invoice: 'فاتورة وديعة الأمان',
  inv_find_amc: 'البحث عن عقود نشطة بصيانة سنوية',
  inv_usage_type: 'نوع الاستخدام',
  inv_all_types: 'جميع الأنواع',
  inv_pending: 'معلق',
  inv_already_generated: 'تم التوليد مسبقاً',
  inv_col_unit: 'الوحدة',
  inv_col_tenant: 'المستأجر',
  inv_col_project: 'المشروع',
  inv_col_amount: 'المبلغ',
  inv_col_status: 'الحالة',
  inv_col_amc_amount: 'مبلغ الصيانة',
  inv_col_payment_term: 'شروط الدفع',
  inv_generated_badge: 'تم التوليد',
  inv_pending_badge: 'معلق',
  inv_generate_btn: 'توليد الفواتير',
  inv_generating_btn: 'جارٍ التوليد...',
  inv_generated_result: 'فاتورة (فواتير) تم توليدها',
  inv_skipped_result: 'عقد (عقود) لديها فواتير مسبقاً (تم تخطيها)',
  inv_active_leases_found: 'عقد (عقود) نشط تم العثور عليه',
  inv_active_leases_amc: 'عقد (عقود) نشط بصيانة سنوية تم العثور عليه',
  inv_list_total: 'إجمالي الفواتير',
  inv_list_outstanding: 'المستحق',
  inv_list_collected: 'المحصَّل',
  inv_list_overdue: 'متأخر',
  inv_search_placeholder: 'البحث عن الفواتير...',
  inv_col_invoice_no: 'رقم الفاتورة',
  inv_col_type: 'النوع',
  inv_col_period: 'الفترة',
  inv_col_vat: 'ضريبة القيمة المضافة',
  inv_col_total: 'الإجمالي',
  inv_col_due_date: 'تاريخ الاستحقاق',
  inv_empty_title: 'لم يتم العثور على فواتير',
  inv_empty_desc: 'أنشئ الفواتير باستخدام اللوحات على اليسار',
  inv_detail_title: 'تفاصيل الفاتورة',
  inv_detail_subtitle: 'تفاصيل الفاتورة وإدارة الحالة',
  inv_detail_base_amount: 'المبلغ الأساسي',
  inv_detail_vat: 'ضريبة القيمة المضافة',
  inv_detail_total: 'المبلغ الإجمالي',
  inv_update_status: 'تحديث الحالة',
  inv_turnover_step1: 'اختيار وتحميل',
  inv_turnover_step2: 'رفع CSV',
  inv_turnover_step3: 'مراجعة وتوليد',
  inv_month: 'الشهر *',
  inv_year: 'السنة *',
  inv_download_csv: 'تحميل نموذج CSV',
  inv_downloading: 'جارٍ التوليد...',
  inv_upload_csv: 'انقر لرفع ملف CSV',
  inv_upload_hint: 'يجب أن يحتوي على عمودَي unit_id و monthly_sales',
  inv_skip_manual: 'تخطي — الإدخال اليدوي',
  inv_csv_downloaded: 'تم تحميل CSV',
  inv_csv_fill_hint: 'أدخل بيانات المبيعات الشهرية لكل وحدة وارفع الملف أدناه.',
  inv_col_to_pct: 'نسبة إيجار التبادل %',
  inv_col_monthly_sales: 'المبيعات الشهرية (درهم)',
  inv_col_calculated: 'الإيجار المحسوب',
  inv_select_all: 'تحديد الكل',
  inv_clear: 'مسح',
  inv_save_sales: 'حفظ بيانات المبيعات',
  inv_saving: 'جارٍ الحفظ...',
  inv_invoiced_badge: 'تمت الفوترة',
  inv_approved_badge: 'موافق عليه',
  inv_col_lease_no: 'رقم العقد',
  inv_col_current_rent: 'الإيجار الحالي',
  inv_col_rent_rev: 'نسبة مراجعة الإيجار %',
  inv_col_new_rent: 'الإيجار الجديد',
  inv_col_current_sd: 'الوديعة الحالية',
  inv_col_sd_rev: 'نسبة مراجعة الوديعة %',
  inv_bulk_leases_found: 'عقد (عقود) نشط تم العثور عليه',

  rec_title: 'الإيصالات',
  rec_subtitle: 'تسجيل المدفوعات على الفواتير وتسوية الشيكات',
  rec_tab_receipts: 'تسجيل الإيصالات',
  rec_tab_cheque: 'تسوية الشيكات',
  rec_unpaid_title: 'الفواتير غير المدفوعة والمدفوعة جزئياً',
  rec_unpaid_desc: 'اختر مستوى هيكل المشروع لعرض الفواتير المستحقة وتسجيل المدفوعات.',
  rec_find_invoices: 'البحث عن الفواتير',
  rec_loading: 'جارٍ التحميل...',
  rec_all_paid_title: 'جميع الفواتير مدفوعة',
  rec_all_paid_desc: 'لم يتم العثور على فواتير غير مدفوعة أو مدفوعة جزئياً للهيكل المحدد',
  rec_total_invoiced: 'إجمالي المفوتَر',
  rec_total_collected: 'إجمالي المحصَّل',
  rec_outstanding: 'الرصيد المتبقي',
  rec_col_invoice: 'رقم الفاتورة',
  rec_col_unit: 'الوحدة',
  rec_col_tenant: 'المستأجر',
  rec_col_type: 'النوع',
  rec_col_total: 'الإجمالي',
  rec_col_paid: 'المدفوع',
  rec_col_balance: 'الرصيد',
  rec_col_due: 'تاريخ الاستحقاق',
  rec_col_status: 'الحالة',
  rec_col_action: 'إجراء',
  rec_payment_history: 'سجل المدفوعات',
  rec_no_payments: 'لم تُسجَّل أي مدفوعات بعد.',
  rec_loading_payments: 'جارٍ التحميل...',
  rec_record_payment: 'تسجيل دفعة',
  rec_payment_amount: 'مبلغ الدفعة (درهم) *',
  rec_payment_date: 'تاريخ الدفع *',
  rec_payment_method: 'طريقة الدفع *',
  rec_invoice_total: 'إجمالي الفاتورة',
  rec_paid: 'المدفوع',
  rec_balance: 'الرصيد',
  rec_exceeds_balance: 'يتجاوز الرصيد المستحق',
  rec_cheque_details: 'تفاصيل الشيك',
  rec_cheque_number: 'رقم الشيك *',
  rec_cheque_date: 'تاريخ الشيك',
  rec_bank_name: 'اسم البنك',
  rec_transfer_details: 'تفاصيل التحويل البنكي',
  rec_transfer_ref: 'مرجع التحويل *',
  rec_online_details: 'تفاصيل الدفع الإلكتروني',
  rec_transaction_id: 'رقم المعاملة *',
  rec_gateway: 'بوابة الدفع',
  rec_ref_notes: 'مرجع / ملاحظات',
  rec_saving: 'جارٍ الحفظ...',
  rec_cheque_recon_title: 'تسوية الشيكات البنكية',
  rec_cheque_recon_desc: 'تتبع وتسوية مدفوعات الشيكات مع كشوف الحساب البنكي.',
  rec_total_cheques: 'إجمالي الشيكات',
  rec_reconciled: 'تمت التسوية',
  rec_pending_recon: 'في انتظار التسوية',
  rec_all_cheques: 'جميع الشيكات',
  rec_pending_filter: 'معلق',
  rec_reconciled_filter: 'تمت التسوية',
  rec_col_receipt: 'رقم الإيصال',
  rec_col_cheque_no: 'رقم الشيك',
  rec_col_cheque_date: 'تاريخ الشيك',
  rec_col_bank: 'البنك',
  rec_col_payment_date: 'تاريخ الدفع',
  rec_col_recon_status: 'الحالة',
  rec_col_recon_action: 'إجراء',
  rec_reconciled_status: 'تمت التسوية',
  rec_pending_status: 'معلق',
  rec_mark_reconciled: 'تعيين كمسوَّى',
  rec_unreconcile: 'إلغاء التسوية',
  rec_cheque_empty_title: 'لم يتم العثور على مدفوعات شيكات',
  rec_cheque_empty_desc: 'ستظهر مدفوعات الشيكات هنا للتسوية',

  maint_title: 'الصيانة وطلبات الخدمة',
  maint_subtitle: 'مسارات منفصلة: طلبات الخدمة (مدفوعة من المستأجر) وطلبات الصيانة (مدفوعة من المالك)',
  maint_new_sr: 'طلب خدمة جديد',
  maint_new_mr: 'طلب صيانة جديد',
  maint_tab_sr: 'طلبات الخدمة',
  maint_tab_mr: 'طلبات الصيانة',
  maint_search_placeholder: 'البحث عن الطلبات...',
  maint_sr_modal_title: 'طلب خدمة جديد',
  maint_sr_modal_subtitle: 'طلب على مستوى الوحدة — مدفوع من المستأجر',
  maint_mr_modal_title: 'طلب صيانة جديد',
  maint_mr_modal_subtitle: 'طلب في المناطق المشتركة — مدفوع من المالك',
  maint_col_unit: 'الوحدة',
  maint_col_title: 'العنوان',
  maint_col_skill: 'نوع المهارة',
  maint_col_provider: 'مزود الخدمة',
  maint_col_priority: 'الأولوية',
  maint_col_status: 'الحالة',
  maint_col_quotes: 'عروض الأسعار',
  maint_col_charge: 'الرسوم',
  maint_col_date: 'التاريخ',
  maint_col_actions: 'الإجراءات',
  maint_col_project: 'المشروع',
  maint_col_building_floor: 'المبنى / الطابق',
  maint_col_area: 'المنطقة',
  maint_sr_empty_title: 'لا توجد طلبات خدمة',
  maint_sr_empty_desc: 'قدِّم طلب خدمة جديداً للبدء',
  maint_mr_empty_title: 'لا توجد طلبات صيانة',
  maint_mr_empty_desc: 'قدِّم طلب صيانة جديداً للبدء',
  maint_area_desc: 'وصف المنطقة',
  maint_title_label: 'العنوان',
  maint_title_placeholder: 'وصف موجز للمشكلة',
  maint_desc_placeholder: 'الوصف التفصيلي للمشكلة...',
  maint_desc_mr_placeholder: 'صف مشكلة الصيانة...',
  maint_tenant_paid_note: 'هذا الطلب مدفوع من المستأجر.',
  maint_landlord_paid_note: 'هذا الطلب مدفوع من المالك.',
  maint_update_title: 'تحديث الطلب',
  maint_provider_charges: 'رسوم مزود الخدمة',
  maint_charge_submitted: 'تم تقديم الرسوم',
  maint_enter_charge: 'أدخل مبلغ الرسوم (درهم)',
  maint_current_status: 'الحالة الحالية:',
  maint_images: 'الصور المرفقة',
  maint_quotes_title: 'عروض الأسعار',
  maint_quotes_subtitle: 'عروض الأسعار للطلب',
  maint_no_quotes: 'لم تُقدَّم أي عروض أسعار بعد.',
  maint_approve_quote: 'موافقة',
  maint_view_quotes: 'عرض',

  renew_title: 'تجديد عقود الإيجار',
  renew_subtitle: 'راجع وعدّل الإيجار للوحدات المشغولة. أنشئ عقوداً مجددة للموافقة عليها.',
  renew_tab_pending: 'في انتظار الموافقة',
  renew_tab_create: 'إنشاء تجديدات',
  renew_tab_approved: 'موافق عليها / مرفوضة',
  renew_pending_count: 'عقد (عقود) مجدَّد في انتظار الموافقة',
  renew_filter_title: 'تصفية الوحدات المشغولة',
  renew_usage_type: 'نوع الاستخدام',
  renew_renewal_start: 'بداية التجديد *',
  renew_renewal_end: 'نهاية التجديد *',
  renew_load_units: 'تحميل الوحدات المشغولة',
  renew_occupied_units: 'وحدة مشغولة',
  renew_enter_revision: 'أدخل + أو - % لمراجعة الإيجار والوديعة وإيجار التبادل',
  renew_col_lease_no: 'رقم العقد',
  renew_col_unit: 'الوحدة',
  renew_col_lessee: 'المستأجر',
  renew_col_current_rent: 'الإيجار الحالي',
  renew_col_rent_rev: 'نسبة مراجعة الإيجار %',
  renew_col_new_rent: 'الإيجار الجديد',
  renew_col_current_sd: 'الوديعة الحالية',
  renew_col_sd_rev: 'نسبة مراجعة الوديعة %',
  renew_col_current_to: 'نسبة التبادل الحالية %',
  renew_col_to_rev: 'نسبة مراجعة التبادل %',
  renew_preview_pdf: 'معاينة PDF',
  renew_submit_approval: 'إرسال للموافقة',
  renew_submitting: 'جارٍ الإرسال...',
  renew_renewal_period: 'فترة التجديد',
  renew_submitted_success: 'تم إرسال العقود المجددة للموافقة. راجعها في تبويب انتظار الموافقة.',
  renew_pending_title: 'لا توجد تجديدات معلقة',
  renew_pending_desc: 'ستظهر هنا العقود المجددة المرسلة للموافقة',
  renew_pending_awaiting: 'عقد (عقود) مجدَّد في انتظار الموافقة',
  renew_col_new_sd: 'الوديعة الجديدة',
  renew_col_period: 'الفترة',
  renew_col_actions: 'الإجراءات',
  renew_approved_title: 'لا توجد تجديدات مكتملة',
  renew_approved_desc: 'ستظهر هنا العقود المجددة الموافق عليها والمرفوضة',
  renew_processed_count: 'تجديد (تجديدات) مكتمل',
  renew_reject_title: 'رفض التجديد',
  renew_reject_reason: 'سبب الرفض *',
  renew_reject_placeholder: 'أدخل سبب الرفض...',
  renew_reject_btn: 'رفض التجديد',
  renew_empty_occupied: 'لا توجد وحدات مشغولة',
  renew_empty_occupied_desc: 'اختر مشروعاً وانقر على تحميل الوحدات المشغولة للبدء',
  renew_download_pdf: 'تحميل PDF',

  wo_title: 'أوامر العمل',
  wo_subtitle: 'إنشاء وإدارة أوامر العمل لمزودي الخدمة',
  wo_new: 'إنشاء أمر عمل',
  wo_search_placeholder: 'البحث عن أوامر العمل...',
  wo_col_wo_no: 'رقم الأمر',
  wo_col_project: 'المشروع',
  wo_col_provider: 'مزود الخدمة',
  wo_col_skill: 'المهارة',
  wo_col_amount: 'المبلغ',
  wo_col_payer: 'الدافع',
  wo_col_status: 'الحالة',
  wo_col_date: 'التاريخ',
  wo_col_actions: 'الإجراءات',
  wo_empty_title: 'لم يتم العثور على أوامر عمل',
  wo_empty_desc: 'أنشئ أمر عمل من طلبات الخدمة أو الصيانة الموافق عليها',
  wo_modal_title: 'إنشاء أمر عمل',
  wo_modal_subtitle: 'اختر المشروع ومزود الخدمة، ثم ابحث عن الطلبات الموافق عليها',
  wo_step1_title: 'الخطوة 1: اختر المشروع ومزود الخدمة',
  wo_step2_title: 'الخطوة 2: اختر الطلبات الموافق عليها',
  wo_step3_title: 'الخطوة 3: تفاصيل أمر العمل',
  wo_select_provider: 'اختر مزود الخدمة',
  wo_search_requests: 'البحث عن الطلبات الموافق عليها',
  wo_searching: 'جارٍ البحث...',
  wo_no_approved: 'لم يتم العثور على عروض أسعار موافق عليها أو طلبات مكتملة لهذا المشروع ومزود الخدمة.',
  wo_sr_section: 'طلبات الخدمة',
  wo_mr_section: 'طلبات الصيانة',
  wo_payment_terms: 'شروط الدفع',
  wo_payer: 'الدافع',
  wo_instructions: 'تعليمات إضافية',
  wo_instructions_placeholder: 'أي تعليمات خاصة لمزود الخدمة...',
  wo_generate_btn: 'إنشاء أمر العمل',
  wo_generating_btn: 'جارٍ الإنشاء...',
  wo_total_selected: 'محدد',
  wo_detail_title: 'تفاصيل أمر العمل',
  wo_detail_subtitle: 'تفاصيل أمر العمل وإدارة الحالة',
  wo_update_status: 'تحديث الحالة',
  wo_instructions_label: 'التعليمات',

  reports_title: 'التقارير',
  reports_subtitle: 'إنشاء وتحميل التقارير التشغيلية بصيغة PDF أو CSV',
  reports_operational: 'التقارير التشغيلية',
  reports_raw_data: 'تقارير البيانات الخام',
  reports_generate_download: 'إنشاء وتحميل التقارير التشغيلية بصيغة PDF أو CSV',

  analytics_title: 'التحليلات',
  analytics_subtitle: 'مؤشرات رئيسية مستخرجة من سجلات التدقيق والعقود والفواتير',
  analytics_user_activity: 'نشاط المستخدم',
  analytics_user_activity_sub: 'أحداث سجل التدقيق لكل مستخدم ويوم خلال آخر 7 أيام',
  analytics_approval_turnaround: 'مدة دورة الموافقة',
  analytics_approval_turnaround_sub: 'معدلات الموافقة والرفض المستخرجة من أحداث سجل التدقيق',

  staff_page_title: 'تعيين المشاريع',
  staff_page_subtitle: 'إنشاء أدوار وإضافة موظفين وتعيين مشاريع وإدارة ملكية الملاك.',
  staff_tab_roles: 'الأدوار والمسؤوليات',
  staff_tab_staff: 'الموظفون',
  staff_tab_assignments: 'تعيينات المشاريع',
  staff_tab_landlords: 'تعيينات الملاك',
  staff_add_assignment: 'إضافة تعيين',
  staff_edit_assignment: 'تعديل التعيين',
  staff_select_project: 'اختر مشروعاً...',
  staff_select_role: 'اختر دوراً...',
  staff_project_required: 'المشروع والدور مطلوبان',

  audit_title: 'سجل التدقيق',
  audit_subtitle: 'تتبع جميع تغييرات البيانات مع الطوابع الزمنية والمستخدمين والقيم قبل/بعد',

  masterdata_title: 'البيانات الرئيسية',
  masterdata_subtitle: 'إدارة مزودي الخدمة والأشخاص وجداول البحث في النظام',

  bulk_title: 'الإعداد الجماعي',
  bulk_subtitle: 'ارفع ملفات CSV لإعداد هيكل المحفظة والأشخاص ومزودي الخدمة على نطاق واسع',

  landlord_title: 'لوحة تحكم المالك',
  landlord_subtitle: 'نظرة عامة على محفظتك ومؤشرات الأداء الرئيسية',

  tenant_title: 'بوابة المستأجر',
  tenant_subtitle: 'اعرض عقدك وفواتيرك وقدم طلبات الخدمة',

  provider_title: 'بوابة مزود الخدمة',
  provider_subtitle: 'تصفح الطلبات المفتوحة وقدم عروض الأسعار وأدر أوامر العمل',

  comms_title: 'المراسلات',
  comms_subtitle: 'إرسال رسائل وإشعارات للمستأجرين والموظفين',

  turnover_title: 'إيجار التبادل',
  turnover_subtitle: 'إدارة بيانات إيجار التبادل والفواتير',
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: en,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('leazify_language') as Language | null;
    if (saved === 'en' || saved === 'ar') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('leazify_language', lang);
  }, []);

  const isRTL = language === 'ar';
  const t = language === 'ar' ? ar : en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'font-arabic' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
