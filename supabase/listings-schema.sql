-- 매물카드 스키마 (WORK-APP-SPEC-v3 ③) — customers + listings
-- Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요. (앱은 이 테이블이 있어야 저장·목록 동작)
-- ※ calculations / memos / contracts.customer_id 추가는 다음 조각(수수료 계산·스티커 메모)에서 별도 제시

create table if not exists public.customers (
  id uuid primary key,
  phone text not null unique,        -- 전화번호 (숫자만, key)
  name text default '',              -- 고객명
  type text default '기타',          -- 구분: 양도자/임차인/기타
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  store_name text default '',        -- 상호
  business_type text default '',     -- 업종
  biz_reg_no text default '',        -- 사업자등록번호 (000-00-00000)
  address text default '',           -- 소재지
  deposit bigint default 0,          -- 보증금 (원)
  monthly_rent bigint default 0,     -- 월세 (원)
  premium bigint default 0,          -- 권리금 (원)
  maintenance_fee bigint default 0,  -- 관리비 (원)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()  -- 최근 상담순 정렬 기준
);

create index if not exists listings_updated_at_idx on public.listings (updated_at desc);
create index if not exists listings_store_name_idx on public.listings (store_name);

-- RLS: 개인용 앱 — anon 키 읽기/쓰기 허용 (contracts 테이블과 동일 방침)
-- 보안을 더 높이려면 Supabase Auth 도입 후 authenticated로 좁히세요.
alter table public.customers enable row level security;
alter table public.listings enable row level security;

create policy "customers_all" on public.customers for all using (true) with check (true);
create policy "listings_all" on public.listings for all using (true) with check (true);
