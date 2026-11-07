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

-- 8) 비밀 설정 표 — 회장 페이지 "작가" 탭에서 정한 작가 비밀번호(암호화된 형태)를 보관
--    읽기 규칙(policy)을 일부러 만들지 않음 → 방문자는 절대 못 읽고, 서버의 비밀 키로만 읽고 씀
create table if not exists public.site_secrets (
  key         text primary key,                    -- 예: 'artist_password'
  value       text not null,                       -- 암호화된 값 (원래 비밀번호 아님)
  updated_at  timestamptz not null default now()
);

alter table public.site_secrets enable row level security;

-- 9) 작가 계정 표 — 작가가 이메일+비밀번호로 직접 가입, 회장이 승인
--    비밀번호는 알아볼 수 없게 바꾼 형태(scrypt)로만 저장. 읽기 규칙이 없어서 방문자는 못 읽음.
create table if not exists public.artists (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,               -- 로그인 아이디 (소문자로 저장)
  name           text not null,                      -- 작가 이름
  password_hash  text not null,                      -- 암호화된 비밀번호
  status         text not null default 'pending'     -- pending(승인 대기) / approved(승인됨) / blocked(막힘)
                 check (status in ('pending','approved','blocked')),
  created_at     timestamptz not null default now()
);

alter table public.artists enable row level security;

-- 웹툰에 "누가 올렸는지" 칸 추가 (작가가 지워지면 비워짐 → 회장만 관리)
alter table public.webtoons add column if not exists artist_id uuid references public.artists (id) on delete set null;
create index if not exists webtoons_artist_idx on public.webtoons (artist_id);

-- 10) TEA TIME(연락처) 칸 글자 표 — 한 줄(id = 1)만 사용, 회장 페이지 "TEA TIME" 탭에서 수정
--     비어 있는 칸은 site.config.ts 의 contact 글자가 대신 보입니다.
create table if not exists public.contact_texts (
  id          integer primary key default 1 check (id = 1),
  eyebrow     text,   -- 작은 윗글씨 (예: tea time)
  title       text,   -- 제목
  description text,   -- 안내 문장
  updated_at  timestamptz not null default now()
);

alter table public.contact_texts enable row level security;

drop policy if exists "Anyone can read contact texts" on public.contact_texts;
create policy "Anyone can read contact texts"
  on public.contact_texts for select
  to anon, authenticated
  using (true);

-- 11) 광고판 표 — 메인 화면에서 5초마다 자동으로 넘어가는 광고판들 (회장 페이지 "광고판" 탭에서 관리)
create table if not exists public.ads (
  id          uuid primary key default gen_random_uuid(),
  eyebrow     text,                                -- 작은 윗글씨 (예: tea time)
  title       text not null,                       -- 제목
  description text,                                -- 안내 문장
  link_url    text,                                -- 링크 (넣으면 "자세히 보기" 버튼)
  is_visible  boolean not null default true,       -- 사이트에 보이기
  created_at  timestamptz not null default now()   -- 먼저 만든 광고판이 먼저 나옴
);

alter table public.ads enable row level security;

drop policy if exists "Anyone can read visible ads" on public.ads;
create policy "Anyone can read visible ads"
  on public.ads for select
  to anon, authenticated
  using (is_visible = true);

-- 지금 TEA TIME 칸 글자를 첫 번째 광고판으로 옮김 (광고판이 하나도 없을 때만)
insert into public.ads (eyebrow, title, description)
select coalesce(c.eyebrow, 'tea time'),
       coalesce(c.title, '나하고 tea타임 할래요?'),
       coalesce(c.description, '궁금한 점이 있다면 언제든 연락 주세요.')
from (select 1) as one
left join public.contact_texts c on c.id = 1
where not exists (select 1 from public.ads);

-- 12) 독자 계정 표 — 댓글을 달려면 독자가 이메일+비밀번호로 가입·로그인 (승인 없이 바로 사용)
--     비밀번호는 알아볼 수 없게 바꾼 형태(scrypt)로만 저장. 읽기 규칙이 없어서 방문자는 못 읽음.
create table if not exists public.readers (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,               -- 로그인 아이디 (소문자로 저장)
  nickname       text not null,                      -- 댓글에 보이는 이름
  password_hash  text not null,                      -- 암호화된 비밀번호
  created_at     timestamptz not null default now()
);

alter table public.readers enable row level security;

-- 13) 댓글 표 — 웹툰 회차마다 달리는 댓글
--     누구나 읽을 수 있고, 쓰기·지우기는 서버의 비밀 키로만 (로그인한 독자 본인 / 회장)
--     회차나 독자 계정이 지워지면 그 댓글도 함께 지워집니다.
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  episode_id   uuid not null references public.episodes (id) on delete cascade,
  reader_id    uuid not null references public.readers (id) on delete cascade,
  author_name  text not null,                        -- 댓글 쓸 때의 닉네임
  body         text not null check (char_length(body) between 1 and 500),
  created_at   timestamptz not null default now()
);

create index if not exists comments_episode_idx on public.comments (episode_id, created_at);

alter table public.comments enable row level security;

drop policy if exists "Anyone can read comments" on public.comments;
create policy "Anyone can read comments"
  on public.comments for select
  to anon, authenticated
  using (true);

-- 14) 웹툰 "완결" 표시 칸 — 켜면 첫 화면에서 요일 탭 대신 "완결" 탭에만 보임
alter table public.webtoons add column if not exists is_completed boolean not null default false;

-- 15) 회차 "공개 시간" 칸 — 연재 요일이 아닌 날 올리면 다음 연재 요일 0시(한국 시간)에 공개 (예약)
--     독자는 공개 시간이 지난 회차만 볼 수 있음. 회장·작가 페이지(서버 비밀 키)는 예약 회차도 보임.
--     예전에 올린 회차는 올린 시간(created_at)을 공개 시간으로 채움 → 그대로 공개 상태.
alter table public.episodes add column if not exists publish_at timestamptz;
update public.episodes set publish_at = created_at where publish_at is null;
alter table public.episodes alter column publish_at set default now();
alter table public.episodes alter column publish_at set not null;

drop policy if exists "Anyone can read episodes of visible webtoons" on public.episodes;
create policy "Anyone can read episodes of visible webtoons"
  on public.episodes for select
  to anon, authenticated
  using (
    publish_at <= now()
    and exists (select 1 from public.webtoons w where w.id = webtoon_id and w.is_visible = true)
  );

-- 16) 회차 썸네일 칸 — 회차 목록에 보이는 작은 대표 그림 (비어 있으면 무프사 = 기본 모양)
--     그림은 images 버킷의 episodes/ 폴더에 저장
alter table public.episodes add column if not exists thumbnail_url text;

-- 16-2) 회차 댓글을 승인된 작가 계정으로도 달 수 있게 — 작가 댓글은 artist_id 에 기록 ("작가" 표시)
--       독자 댓글(reader_id) 또는 작가 댓글(artist_id) 중 하나는 꼭 있어야 함
alter table public.comments add column if not exists artist_id uuid references public.artists (id) on delete cascade;
alter table public.comments alter column reader_id drop not null;
alter table public.comments drop constraint if exists comments_author_check;
alter table public.comments add constraint comments_author_check check (reader_id is not null or artist_id is not null);

-- 16-3) 회장도 회차 댓글을 바로 달 수 있게 — 회장 댓글은 is_owner = true ("회장" 표시)
alter table public.comments add column if not exists is_owner boolean not null default false;
alter table public.comments drop constraint if exists comments_author_check;
alter table public.comments add constraint comments_author_check
  check (reader_id is not null or artist_id is not null or is_owner);

-- 17) 작가 커뮤니티 — 승인된 작가 + 회장만 보는 게시판 (글 + 댓글, 익명/실명 선택)
--     읽기 규칙(policy)을 일부러 만들지 않음 → 방문자는 절대 못 읽고, 서버의 비밀 키로만 읽고 씀
--     익명 글도 누가 썼는지(author_artist_id)는 저장 → 회장만 실명 확인 가능, 작가들에게는 "익명"으로만 보임
--     author_artist_id 가 비어 있고 is_owner = true 면 회장이 쓴 글
create table if not exists public.community_posts (
  id                uuid primary key default gen_random_uuid(),
  author_artist_id  uuid references public.artists (id) on delete cascade,
  is_owner          boolean not null default false,
  is_anonymous      boolean not null default false,
  title             text not null check (char_length(title) between 1 and 100),
  body              text not null check (char_length(body) between 1 and 5000),
  created_at        timestamptz not null default now()
);

create index if not exists community_posts_created_idx on public.community_posts (created_at desc);
alter table public.community_posts enable row level security;

create table if not exists public.community_comments (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references public.community_posts (id) on delete cascade,
  author_artist_id  uuid references public.artists (id) on delete cascade,
  is_owner          boolean not null default false,
  is_anonymous      boolean not null default false,
  body              text not null check (char_length(body) between 1 and 1000),
  created_at        timestamptz not null default now()
);

create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);
alter table public.community_comments enable row level security;
