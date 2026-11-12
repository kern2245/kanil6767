import Link from "next/link";
import { BookOpen, PenLine } from "lucide-react";

import { siteConfig } from "@/site.config";
import { getHeroTexts } from "@/lib/data";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/lang";

/* 첫 화면(히어로).
   - 글자는 관리자 페이지(/admin)의 "히어로" 탭에서 바꿉니다. (비어 있으면 site.config.ts 의 hero 글자)
   - 21st.dev 의 멋진 히어로로 바꾸고 싶다면: 그 컴포넌트를 components/ui 에 넣고,
     이 파일의 <section> 안쪽을 그 컴포넌트로 감싸면 됩니다. (Claude에게 /add-component 로 요청) */
export async function Hero() {
  const { lang, t } = await getT();
  // 영어 화면이면 영어 글자 (lib/i18n.ts 의 hero)
  const texts = lang === "ko" ? await getHeroTexts() : t.hero;

  return (
    <section id="top" className="relative overflow-hidden">
      {/* 휴대폰에서만: 제목 뒤에 은은한 보라 빛 (컴퓨터 화면은 예전 그대로) */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-6 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl sm:hidden"
      />
      {/* 높이: 컴퓨터는 화면의 절반쯤 / 휴대폰은 글자 높이만큼 (아래 빈 공간 줄임)
          휴대폰: 가운데 정렬 + 버튼이 화면 폭 가득 / 컴퓨터(sm 이상): 왼쪽 정렬 */}
      <Container className="relative flex flex-col items-center py-12 text-center sm:min-h-[55svh] sm:items-start sm:justify-center sm:py-16 sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary sm:text-sm sm:tracking-[0.2em]">
          {texts.eyebrow}
        </p>
        <h1 className="title-gradient mt-4 max-w-4xl whitespace-pre-line text-[2.6rem] font-bold leading-[1.15] tracking-tight [word-break:keep-all] sm:mt-5 sm:text-6xl sm:font-semibold sm:leading-[1.1] lg:text-7xl">
          {texts.title}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [word-break:keep-all] sm:mt-6 sm:text-lg">
          {texts.description}
        </p>

        {/* 버튼 2개: 웹툰 보러 가기 / 내 웹툰 올리기 (글자·주소: site.config.ts 의 hero) */}
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href={siteConfig.hero.primaryCta.href}>
              <BookOpen />
              {lang === "ko" ? siteConfig.hero.primaryCta.label : t.hero.read}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href={siteConfig.hero.secondaryCta.href}>
              <PenLine />
              {lang === "ko" ? siteConfig.hero.secondaryCta.label : t.hero.create}
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
