-- Pharmacy Inventory — PostgreSQL schema
-- Run on a fresh database: psql $DATABASE_URL -f sql/schema.sql

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff', 'pharmacist')),
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions (user_id);
create index if not exists sessions_expires_at_idx on sessions (expires_at);

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
