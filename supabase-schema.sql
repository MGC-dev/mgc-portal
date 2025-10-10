-- Minimal Supabase schema for core app

create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;$$ language plpgsql;

-- profiles (links to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  company_name text,
  phone text,
  address text,
  role text default 'client' check (role in ('client','provider','admin','support')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure set_updated_at();
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (id = auth.uid());
-- profiles: extend roles to include super_admin
alter table public.profiles
  alter column role drop default;
alter table public.profiles
  alter column role set default 'client';
comment on column public.profiles.role is 'Allowed roles: client, provider, admin, support, super_admin';
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('client','provider','admin','support','super_admin'));

-- role assignments (global roles)
create table if not exists public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('client','provider','admin','support')),
  granted_at timestamptz default now()
);
alter table public.role_assignments enable row level security;
drop policy if exists role_assignments_view_own on public.role_assignments;
create policy role_assignments_view_own on public.role_assignments for select using (user_id = auth.uid());
drop policy if exists role_assignments_admin_manage on public.role_assignments;
create policy role_assignments_admin_manage on public.role_assignments for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

-- companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.companies enable row level security;
drop policy if exists companies_select_owner_admin on public.companies;
create policy companies_select_owner_admin on public.companies for select using (owner_user_id = auth.uid() or exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin'));
drop policy if exists companies_insert_owner_admin on public.companies;
create policy companies_insert_owner_admin on public.companies for insert with check (owner_user_id = auth.uid() or exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin'));
drop policy if exists companies_update_owner_admin on public.companies;
create policy companies_update_owner_admin on public.companies for update using (owner_user_id = auth.uid() or exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin'));

-- appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  attendee_user_id uuid not null references public.profiles(id) on delete cascade,
  provider_user_id uuid references public.profiles(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  notes text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','rescheduled')),
  created_at timestamptz default now()
);
create index if not exists idx_appointments_attendee on public.appointments(attendee_user_id);
create index if not exists idx_appointments_provider on public.appointments(provider_user_id);
create index if not exists idx_appointments_company on public.appointments(company_id);
create index if not exists idx_appointments_time on public.appointments(start_time);
alter table public.appointments enable row level security;
drop policy if exists appointments_select_participants_admin on public.appointments;
create policy appointments_select_participants_admin on public.appointments for select using (attendee_user_id = auth.uid() or provider_user_id = auth.uid() or exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin'));
drop policy if exists appointments_insert_attendee_admin on public.appointments;
create policy appointments_insert_attendee_admin on public.appointments for insert with check (attendee_user_id = auth.uid() or exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin'));
drop policy if exists appointments_update_participants_admin on public.appointments;
create policy appointments_update_participants_admin on public.appointments for update using (attendee_user_id = auth.uid() or provider_user_id = auth.uid() or exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin'));

-- invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null,
  status text not null default 'draft' check (status in ('draft','sent','paid','void')),
  due_date date,
  created_at timestamptz default now()
);
create index if not exists idx_invoices_company on public.invoices(company_id);
create index if not exists idx_invoices_client on public.invoices(client_user_id);
alter table public.invoices enable row level security;
drop policy if exists invoices_client_select_own on public.invoices;
create policy invoices_client_select_own on public.invoices for select using (client_user_id = auth.uid());
drop policy if exists invoices_admin_manage on public.invoices;
create policy invoices_admin_manage on public.invoices for all using (exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin'));

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  method text,
  paid_at timestamptz,
  status text not null default 'initiated' check (status in ('initiated','succeeded','failed')),
  created_at timestamptz default now()
);
create index if not exists idx_payments_invoice on public.payments(invoice_id);
alter table public.payments enable row level security;
drop policy if exists payments_client_select_own on public.payments;
create policy payments_client_select_own on public.payments for select using (exists (select 1 from public.invoices i where i.id = invoice_id and i.client_user_id = auth.uid()));
drop policy if exists payments_admin_manage on public.payments;
create policy payments_admin_manage on public.payments for all using (exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.role_assignments where user_id = auth.uid() and role = 'admin'));

-- support tickets
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz default now()
);
create index if not exists idx_support_tickets_user on public.support_tickets(user_id);
alter table public.support_tickets enable row level security;
drop policy if exists support_tickets_owner_select on public.support_tickets;
create policy support_tickets_owner_select on public.support_tickets for select using (user_id = auth.uid());
drop policy if exists support_tickets_owner_update on public.support_tickets;
create policy support_tickets_owner_update on public.support_tickets for update using (user_id = auth.uid());
drop policy if exists support_tickets_support_admin_manage on public.support_tickets;
create policy support_tickets_support_admin_manage on public.support_tickets for all using (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('support','admin'))) with check (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('support','admin')));

-- messages (ticket messages)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists idx_messages_ticket on public.messages(ticket_id);
alter table public.messages enable row level security;
drop policy if exists messages_participant_select on public.messages;
create policy messages_participant_select on public.messages for select using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and (
      t.user_id = auth.uid() or exists (
        select 1 from public.role_assignments
        where user_id = auth.uid() and role in ('support','admin','super_admin')
      )
    )
  ));
drop policy if exists messages_sender_or_support_insert on public.messages;
create policy messages_sender_or_support_insert on public.messages for insert with check (sender_user_id = auth.uid() or exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('support','admin','super_admin')));

-- Email OTPs (durable store for verification codes)
create table if not exists public.email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  attempts integer not null default 0,
  metadata jsonb,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists idx_email_otps_email on public.email_otps(email);
create index if not exists idx_email_otps_created_at on public.email_otps(created_at);
-- RLS can be enabled if desired; service role bypasses RLS for server-side operations
-- alter table public.email_otps enable row level security;

-- =====================
-- New tables per backend plan
-- =====================

-- subscription tiers
create table if not exists public.subscription_tiers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null check (name in ('FreeStarter','Intermediate','Advanced')),
  description text,
  created_at timestamptz default now()
);
alter table public.subscription_tiers enable row level security;
drop policy if exists subscription_tiers_select_all on public.subscription_tiers;
create policy subscription_tiers_select_all on public.subscription_tiers for select using (true);
drop policy if exists subscription_tiers_admin_manage on public.subscription_tiers;
create policy subscription_tiers_admin_manage on public.subscription_tiers for all
  using (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('admin','super_admin')))
  with check (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('admin','super_admin')));

-- user subscriptions
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier_id uuid not null references public.subscription_tiers(id) on delete restrict,
  status text not null default 'active' check (status in ('active','expired','suspended')),
  started_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_user_subscriptions_user on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_tier on public.user_subscriptions(tier_id);
alter table public.user_subscriptions enable row level security;
drop policy if exists user_subscriptions_select_own on public.user_subscriptions;
create policy user_subscriptions_select_own on public.user_subscriptions for select using (user_id = auth.uid());
drop policy if exists user_subscriptions_insert_self on public.user_subscriptions;
create policy user_subscriptions_insert_self on public.user_subscriptions for insert with check (user_id = auth.uid());
drop policy if exists user_subscriptions_update_own on public.user_subscriptions;
create policy user_subscriptions_update_own on public.user_subscriptions for update using (user_id = auth.uid());
drop policy if exists user_subscriptions_admin_manage on public.user_subscriptions;
create policy user_subscriptions_admin_manage on public.user_subscriptions for all
  using (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('admin','super_admin')))
  with check (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('admin','super_admin')));

-- service components
create table if not exists public.service_components (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text,
  access_level text default 'basic' check (access_level in ('basic','intermediate','advanced')),
  created_at timestamptz default now()
);
alter table public.service_components enable row level security;
drop policy if exists service_components_select_all on public.service_components;
create policy service_components_select_all on public.service_components for select using (true);
drop policy if exists service_components_admin_manage on public.service_components;
create policy service_components_admin_manage on public.service_components for all
  using (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('admin','super_admin')))
  with check (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('admin','super_admin')));

-- link components to tiers
create table if not exists public.service_component_access (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.service_components(id) on delete cascade,
  tier_id uuid not null references public.subscription_tiers(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists idx_service_component_access_component on public.service_component_access(component_id);
create index if not exists idx_service_component_access_tier on public.service_component_access(tier_id);
alter table public.service_component_access enable row level security;
drop policy if exists service_component_access_select_all on public.service_component_access;
create policy service_component_access_select_all on public.service_component_access for select using (true);
drop policy if exists service_component_access_admin_manage on public.service_component_access;
create policy service_component_access_admin_manage on public.service_component_access for all
  using (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('admin','super_admin')))
  with check (exists (select 1 from public.role_assignments where user_id = auth.uid() and role in ('admin','super_admin')));

-- =====================
-- Grants to ensure service role and authenticated clients can operate
-- =====================
-- Schema usage
grant usage on schema public to service_role, authenticated, anon;

-- Service role (bypasses RLS)
grant all privileges on table public.email_otps to service_role;
grant all privileges on table public.profiles to service_role;
grant all privileges on table public.subscription_tiers to service_role;
grant all privileges on table public.user_subscriptions to service_role;
grant all privileges on table public.service_components to service_role;
grant all privileges on table public.service_component_access to service_role;
-- Add core tables for service role
grant all privileges on table public.appointments to service_role;
grant select on public.role_assignments to authenticated;
grant all privileges on public.role_assignments to service_role;
revoke all on public.role_assignments from anon;

-- Authenticated/Anon clients (subject to RLS policies)
-- Only grant what the app needs; RLS will still enforce per-row access
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;
-- Add required grants for appointments used by client sessions
grant select, insert, update on table public.appointments to authenticated;
grant select on table public.appointments to anon;
grant select on table public.appointments to anon;