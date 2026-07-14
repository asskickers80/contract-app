-- 점포라인 계약서 앱 — Supabase 스키마
-- Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.

create table if not exists public.contracts (
  id uuid primary key,
  store_name text not null,          -- 상호
  business_type text,                -- 업종
  biz_reg_no text,                   -- 사업자등록번호 (000-00-00000)
  address text,                      -- 소재지
  agent_name text,                   -- 담당 에이전트
  product_name text,                 -- 광고상품명
  ad_fee bigint,                     -- 광고료
  vat bigint,                        -- 부가세
  total bigint,                      -- 총액
  start_date date,                   -- 광고개시일
  end_date date,                     -- 광고종료일
  period_months int,                 -- 광고기간(개월)
  customer_name text,                -- 광고주 성명
  signed_at timestamptz not null,    -- 서명 완료 시각
  pdf_path text not null,            -- Storage 경로
  file_name text,                    -- 원래 파일명 (계약서_상호_YYYYMMDD.pdf)
  device_info jsonb,                 -- 증빙용: userAgent, 서명 시각
  payment_opened_at timestamptz,     -- 결제 페이지 오픈 시각
  created_at timestamptz not null default now()
);

create index if not exists contracts_store_name_idx on public.contracts (store_name);
create index if not exists contracts_signed_at_idx on public.contracts (signed_at desc);

-- 개인정보(사업자번호) 저장 — RLS 켜고 anon 키로 읽기/쓰기 허용 (내부 전용 1인 사용 전제)
-- 보안을 더 높이려면 Supabase Auth 로그인을 붙이고 아래 정책을 authenticated로 좁히세요.
alter table public.contracts enable row level security;

create policy "contracts_insert" on public.contracts for insert with check (true);
create policy "contracts_select" on public.contracts for select using (true);
create policy "contracts_update_payment" on public.contracts for update using (true) with check (true);

-- Storage: 비공개 버킷 'contracts' 생성 (public 체크 해제!)
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

create policy "contracts_storage_insert" on storage.objects
  for insert with check (bucket_id = 'contracts');
create policy "contracts_storage_select" on storage.objects
  for select using (bucket_id = 'contracts');


-- ── 작업 보관함(boards) — 캡처 보드 전체(메모·노트·수수료·매물정보·광고) 서버 저장 ──
-- 2026-07-14 추가: 기기 저장소 유실(홈 화면 앱 재설치 등) 대응
create table if not exists public.boards (
  key text primary key,              -- 보드 키 (cap-<timestamp>)
  store_name text,                   -- 상호 (목록 표시용)
  captured_at timestamptz,           -- 캡처 시각
  updated_at timestamptz not null default now(),
  image text,                        -- 캡처 원본 (dataURL)
  thumb text,                        -- 목록용 썸네일 (dataURL)
  image_sig text,                    -- 이미지 지문 (중복 캡처 판정)
  data jsonb                         -- 보드 전체 (notes/ink/fee/info/ad 등, image 제외)
);

create index if not exists boards_captured_at_idx on public.boards (captured_at desc);

alter table public.boards enable row level security;
create policy "boards_all" on public.boards for all using (true) with check (true);
