-- 꼬미 키우기 순위표 — Supabase 의 SQL Editor 에 이 글 전체를 붙여넣고 Run 을 한 번 누르세요.
-- (supabase/schema.sql 의 27) 과 같은 내용. 여러 번 실행해도 괜찮아요.)
--   member_id  : 세카이 회원 번호 (회원이 지워지면 기록도 같이 지워짐)
--   best_stage : 최고 스테이지 (더 높은 기록만 저장)
--   job        : 그 기록을 세울 때의 직업 (sword / bow / magic / tamer)
--   읽기 규칙 없음 → 서버 비밀 키로만 읽고 씀 (방문자가 직접 고칠 수 없음)
create table if not exists public.game_scores (
  member_id   uuid primary key references public.artists (id) on delete cascade,
  best_stage  integer not null default 0 check (best_stage between 0 and 100000),
  job         text check (job is null or job in ('sword','bow','magic','tamer')),
  updated_at  timestamptz not null default now()
);
create index if not exists game_scores_rank_idx on public.game_scores (best_stage desc, updated_at asc);
alter table public.game_scores enable row level security;
