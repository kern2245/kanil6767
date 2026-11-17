-- 꼬미 키우기 세이브 (로그인 회원 자동 저장) — Supabase 의 SQL Editor 에 이 글 전체를 붙여넣고 Run 을 한 번 누르세요.
-- (supabase/schema.sql 의 28) 과 같은 내용. 여러 번 실행해도 괜찮아요.)
--   member_id  : 세카이 회원 번호 (회원이 지워지면 세이브도 같이 지워짐)
--   data       : 게임 진행 기록 (바나나·강화·직업·장비·미션) — 20,000 글자까지
--   읽기 규칙 없음 → 서버 비밀 키로만 읽고 씀 (방문자가 직접 보거나 고칠 수 없음)
create table if not exists public.game_saves (
  member_id   uuid primary key references public.artists (id) on delete cascade,
  data        jsonb not null check (octet_length(data::text) <= 20000),
  updated_at  timestamptz not null default now()
);
alter table public.game_saves enable row level security;
