-- ============================================================================
-- 한국판 / 영어판 나누기 (한 번만 실행)
-- ----------------------------------------------------------------------------
-- 사용법: Supabase → SQL Editor → New query → 이 파일 내용을 전부 붙여넣고 → Run
--
-- 하는 일
--   1) 웹툰 표에 "언어(lang)" 칸 추가: 'ko' = 한국판, 'en' = 영어판 (지금 있는 웹툰은 모두 한국판)
--   2) 지금 한국판 웹툰 안에 붙어 있는 영어판(영어 제목 + 영어판 그림)을
--      → 따로 떨어진 "영어판 웹툰" 하나로 옮김 (표지·연재 요일·작가는 한국판과 같게 시작)
--      → 영어판 그림이 있는 회차만 옮김 (회차 번호·공개 시간·썸네일 그대로)
--   3) 옮긴 뒤 한국판 쪽의 영어 제목·영어판 그림 기록은 비움 (그림 파일은 영어판 웹툰이 그대로 씀)
--
-- 여러 번 실행해도 안전해요 (이미 옮긴 건 다시 옮기지 않음)
-- ============================================================================

-- 1) 언어 칸
alter table public.webtoons add column if not exists lang text not null default 'ko';
alter table public.webtoons drop constraint if exists webtoons_lang_check;
alter table public.webtoons add constraint webtoons_lang_check check (lang in ('ko', 'en'));
create index if not exists webtoons_lang_idx on public.webtoons (lang);

-- 2) 붙어 있던 영어판 → 따로 영어판 웹툰으로
do $$
declare
  src record;
  new_id uuid;
begin
  for src in
    select w.* from public.webtoons w
    where w.lang = 'ko'
      and exists (
        select 1 from public.episodes e
        where e.webtoon_id = w.id and cardinality(e.image_urls_en) > 0
      )
  loop
    insert into public.webtoons (title, weekday, cover_url, artist_id, is_up, is_completed, sort_order, is_visible, lang)
    values (coalesce(nullif(src.title_en, ''), src.title), src.weekday, src.cover_url, src.artist_id,
            false, src.is_completed, src.sort_order, src.is_visible, 'en')
    returning id into new_id;

    insert into public.episodes (webtoon_id, number, title, image_urls, publish_at, thumbnail_url)
    select new_id, e.number, coalesce(nullif(e.title_en, ''), e.title), e.image_urls_en, e.publish_at, e.thumbnail_url
    from public.episodes e
    where e.webtoon_id = src.id and cardinality(e.image_urls_en) > 0;

    -- 3) 한국판 쪽 영어 기록 비우기
    update public.episodes set image_urls_en = '{}', title_en = null where webtoon_id = src.id;
    update public.webtoons set title_en = null where id = src.id;
  end loop;
end $$;

-- 결과 확인: 언어별 웹툰 목록
select lang, title, weekday, is_visible from public.webtoons order by lang, sort_order, created_at;
