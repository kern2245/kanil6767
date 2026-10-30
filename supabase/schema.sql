-- ============================================================================
--  Supabase 초기 설정 SQL  (한 번만 실행)
--  사용법: Supabase 대시보드 → 왼쪽 메뉴 SQL Editor → New query
--          → 이 파일 내용을 전부 복사해 붙여넣기 → 오른쪽 아래 Run
--  여러 번 실행해도 문제 없도록 만들어져 있습니다.
-- ============================================================================

-- 1) 카드(항목)를 저장하는 표 만들기
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  section     text not null default 'features',   -- 어느 섹션의 카드인지
  title       text not null,                       -- 제목
  description text,                                -- 설명
  image_url   text,                                -- 이미지 주소
  link_url    text,                                -- 클릭 시 이동할 링크
  sort_order  integer not null default 0,          -- 순서 (작을수록 앞)
  is_visible  boolean not null default true,       -- 사이트에 보이기
  created_at  timestamptz not null default now()
);

create index if not exists items_section_order_idx on public.items (section, sort_order);

-- 2) 보안 규칙(RLS) 켜기
--    - 방문자: '보이기'로 설정된 카드만 읽을 수 있음
--    - 추가/수정/삭제: 규칙을 만들지 않음 → 서버의 비밀 키(SECRET KEY)로만 가능
alter table public.items enable row level security;

drop policy if exists "Anyone can read visible items" on public.items;
create policy "Anyone can read visible items"
  on public.items for select
  to anon, authenticated
  using (is_visible = true);

-- 3) 이미지 저장 공간(버킷) 만들기 — 공개 버킷이라 이미지 주소로 누구나 볼 수 있음
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- 4) 예시 카드 3개 (표가 비어 있을 때만 넣음)
insert into public.items (section, title, description, sort_order)
select * from (values
  ('features', '첫 번째 기능', '관리자 페이지에서 이 카드를 수정해 보세요.', 1),
  ('features', '두 번째 기능', '이미지와 링크를 넣을 수도 있어요.', 2),
  ('features', '세 번째 기능', '필요 없으면 삭제하면 됩니다.', 3)
) as v(section, title, description, sort_order)
where not exists (select 1 from public.items);

-- 5) 첫 화면(히어로) 글자를 저장하는 표 — 한 줄(id = 1)만 사용
--    비어 있는 칸은 site.config.ts 의 글자가 대신 보입니다.
create table if not exists public.hero (
  id              integer primary key default 1 check (id = 1),
  eyebrow         text,   -- 작은 윗글씨
  title           text,   -- 큰 제목 (줄바꿈 가능)
  description     text,   -- 소개 문장
  primary_label   text,   -- 첫 번째 버튼 글자
  secondary_label text,   -- 두 번째 버튼 글자
  updated_at      timestamptz not null default now()
);

alter table public.hero enable row level security;

drop policy if exists "Anyone can read hero" on public.hero;
create policy "Anyone can read hero"
  on public.hero for select
  to anon, authenticated
  using (true);

-- 6) 웹툰 목록 표 — 요일별 웹툰 목록(첫 화면)에 보이는 웹툰
--    표지 그림은 3) 에서 만든 images 버킷의 webtoons/ 폴더에 저장됩니다.
create table if not exists public.webtoons (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                       -- 웹툰 제목
  weekday     text not null default 'mon'          -- 연재 요일
              check (weekday in ('mon','tue','wed','thu','fri','sat','sun')),
  cover_url   text,                                -- 표지 그림 주소
  is_up       boolean not null default false,      -- UP 표시 (새 회차 올라옴)
  sort_order  integer not null default 0,          -- 순서 (작을수록 위)
  is_visible  boolean not null default true,       -- 사이트에 보이기
  created_at  timestamptz not null default now()
);

create index if not exists webtoons_weekday_order_idx on public.webtoons (weekday, sort_order);

alter table public.webtoons enable row level security;

drop policy if exists "Anyone can read visible webtoons" on public.webtoons;
create policy "Anyone can read visible webtoons"
  on public.webtoons for select
  to anon, authenticated
  using (is_visible = true);

-- 7) 웹툰 회차 표 — 웹툰마다 1화, 2화… 와 만화 그림들
--    그림은 images 버킷의 episodes/ 폴더에 저장되고, image_urls 에 위에서 아래 순서로 들어갑니다.
--    웹툰을 지우면 그 웹툰의 회차도 함께 지워집니다.
create table if not exists public.episodes (
  id          uuid primary key default gen_random_uuid(),
  webtoon_id  uuid not null references public.webtoons (id) on delete cascade,
  number      integer not null,                    -- 회차 번호 (1, 2, 3 ...)
  title       text not null,                       -- 회차 제목
  image_urls  text[] not null default '{}',        -- 만화 그림 주소들 (위→아래 순서)
  created_at  timestamptz not null default now(),
  unique (webtoon_id, number)
);

alter table public.episodes enable row level security;

drop policy if exists "Anyone can read episodes of visible webtoons" on public.episodes;
create policy "Anyone can read episodes of visible webtoons"
  on public.episodes for select
  to anon, authenticated
  using (exists (select 1 from public.webtoons w where w.id = webtoon_id and w.is_visible = true));
