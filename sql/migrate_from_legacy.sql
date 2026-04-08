-- Upgrade an existing install that only had users(id, email, password_hash, created_at)
-- and sessions. Safe to run once; uses IF NOT EXISTS patterns where possible.

alter table users add column if not exists name text not null default '';
alter table users add column if not exists role text not null default 'staff';

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('admin', 'staff', 'pharmacist'));

-- medicines table (full definition if missing)
create table if not exists medicines (
  id uuid primary key,
  name text not null,
  batch_number text not null,
  expiry_date date not null,
  quantity integer not null check (quantity >= 0),
  price numeric(14, 2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  created_by uuid references users(id) on delete set null
);

create index if not exists medicines_expiry_date_idx on medicines (expiry_date);
create index if not exists medicines_created_at_idx on medicines (created_at desc);
