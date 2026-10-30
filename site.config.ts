/* ==========================================================================
   ★ 사이트 내용 설정 파일
   --------------------------------------------------------------------------
   사이트에 보이는 글자(이름, 소개, 메뉴, 연락처 등)는 대부분 여기에 있습니다.
   따옴표 " " 안의 글자만 바꾸고 저장하면 화면에 바로 반영됩니다.
   (따옴표, 쉼표, 중괄호 { } 는 지우지 않도록 조심!)
   ========================================================================== */

import type { Item, Webtoon, Weekday } from "@/lib/types";

export const siteConfig = {
  /* 브라우저 탭 제목과 검색 결과에 보이는 정보 */
  name: "セカイ",
  title: "My Studio — 나의 첫 웹사이트",
  description: "바이브 코딩으로 만든 나의 웹사이트입니다.",

  /* 상단 메뉴 (href 의 #이름 은 아래 섹션의 id 와 같아야 해당 위치로 이동) */
  nav: [
    { label: "소개", href: "#about" },
    { label: "기능", href: "#features" },
    { label: "연락처", href: "#contact" },
  ],

  /* 상단 메뉴 오른쪽 버튼 (누르면 새 탭에서 관리자 페이지가 열림) */
  secretButton: { label: "비밀 버튼", href: "/admin" },

  /* 첫 화면(히어로) */
  hero: {
    eyebrow: "Hello, World",
    title: "생각을 바로\n화면으로 만듭니다",
    description:
      "이 문장을 바꿔 나를 소개해 보세요. site.config.ts 파일에서 글자만 바꾸면 여기가 바뀝니다.",
    primaryCta: { label: "더 알아보기", href: "#features" },
    secondaryCta: { label: "연락하기", href: "#contact" },
  },

  /* 소개 섹션 */
  about: {
    eyebrow: "About",
    title: "소개",
    paragraphs: [
      "여기에 나 또는 우리 팀, 가게, 프로젝트에 대한 소개를 적습니다.",
      "두 번째 문단도 필요하면 이렇게 줄을 추가하면 됩니다.",
    ],
  },

  /* 기능(항목) 섹션의 제목 — 카드 목록 자체는 관리자 페이지(/admin)에서 관리 */
  features: {
    eyebrow: "Features",
    title: "기능",
    description: "관리자 페이지에서 카드를 추가·수정·삭제할 수 있는 영역입니다.",
  },

  /* 요일별 웹툰 목록 섹션 — 웹툰 자체는 관리자 페이지(/admin)의 "웹툰" 탭에서 관리 */
  webtoons: {
    eyebrow: "Weekly",
    title: "요일별 웹툰",
    /* 요일 이름 (key 는 데이터베이스에 저장되는 값이라 바꾸지 마세요) */
    weekdays: [
      { key: "mon", label: "월" },
      { key: "tue", label: "화" },
      { key: "wed", label: "수" },
      { key: "thu", label: "목" },
      { key: "fri", label: "금" },
      { key: "sat", label: "토" },
      { key: "sun", label: "일" },
    ] as { key: Weekday; label: string }[],
  },

  /* 연락처 섹션 */
  contact: {
    eyebrow: "tea time",
    title: "나하고 tea타임 할래요?",
    description: "궁금한 점이 있다면 언제든 연락 주세요.",
    email: "hello@example.com",
    links: [
      { label: "Instagram", href: "https://instagram.com" },
      { label: "GitHub", href: "https://github.com" },
    ],
  },

  /* 맨 아래(푸터) */
  footer: {
    copyright: "© 2026 My Studio. All rights reserved.",
  },

  /* 관리자 페이지에서 관리할 섹션 목록.
     key  = 데이터베이스에 저장되는 이름(영문 소문자),
     label = 관리자 화면에 보이는 이름.
     예) 포트폴리오라면 { key: "works", label: "작업물" } 을 추가 */
  adminSections: [{ key: "features", label: "기능" }],
};

/* Supabase를 아직 연결하지 않았을 때 대신 보여줄 예시 카드.
   Supabase를 연결하면 이 내용 대신 관리자 페이지에서 등록한 카드가 보입니다. */
export const sampleItems: Item[] = [
  {
    id: "sample-1",
    section: "features",
    title: "첫 번째 기능",
    description: "카드 하나에 제목, 설명, 이미지, 링크를 넣을 수 있어요.",
    image_url: null,
    link_url: null,
    sort_order: 1,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "sample-2",
    section: "features",
    title: "두 번째 기능",
    description: "관리자 페이지에서 순서를 바꾸거나 숨길 수도 있어요.",
    image_url: null,
    link_url: null,
    sort_order: 2,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "sample-3",
    section: "features",
    title: "세 번째 기능",
    description: "포트폴리오라면 작업물, 가게라면 메뉴처럼 자유롭게 쓰세요.",
    image_url: null,
    link_url: null,
    sort_order: 3,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

/* Supabase에 웹툰을 아직 올리지 않았을 때 대신 보여줄 예시 웹툰 (요일마다 3개, 표지 없음).
   관리자 페이지 "웹툰" 탭에서 웹툰을 올리면 이 예시 대신 올린 웹툰이 보입니다. */
export const sampleWebtoons: Webtoon[] = siteConfig.webtoons.weekdays.flatMap((day) =>
  [1, 2, 3].map((n) => ({
    id: `sample-${day.key}-${n}`,
    title: `${day.label}요 예시 웹툰 ${n}`,
    weekday: day.key,
    cover_url: null,
    is_up: false, // UP 은 오늘 요일 웹툰에 자동으로 붙음
    sort_order: n,
    is_visible: true,
    created_at: "2026-01-01T00:00:00Z",
  })),
);
