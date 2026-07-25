-- Add a company profile URL separate from the factory's own website.
-- Run after 011_design_partner_hardening.sql on existing projects.

alter table public.factories
  add column if not exists company_url text;
