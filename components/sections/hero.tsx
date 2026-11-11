import Link from "next/link";
import { BookOpen, PenLine } from "lucide-react";

import { siteConfig } from "@/site.config";
import { getHeroTexts } from "@/lib/data";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

/* 첫 화면(히어로).
   - 글자는 관리자 페이지(/admin)의 "히어로" 탭에서 바꿉니다. (비어 있으면 site.config.ts 의 hero 글자)
   - 21st.dev 의 멋진 히어로로 바꾸고 싶다면: 그 컴포넌트를 components/ui 에 넣고,
     이 파일의 <section> 안쪽을 그 컴포넌트로 감싸면 됩니다. (Claude에게 /add-component 로 요청) */
export async function Hero() {
  const texts = await getHeroTexts();

  return (
    <section id="top" className="relative overflow-hidden">
      {/* 높이: 화면의 절반쯤 (예전 80% → 너무 비어 보여서 줄임) */}
      <Container className="flex min-h-[55svh] flex-col justify-center py-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          {texts.eyebrow}
        </p>
        <h1 className="title-gradient mt-5 max-w-4xl whitespace-pre-line text-5xl font-semibold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
          {texts.title}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          {texts.description}
        </p>

        {/* 버튼 2개: 웹툰 보러 가기 / 내 웹툰 올리기 (글자·주소: site.config.ts 의 hero) */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={siteConfig.hero.primaryCta.href}>
              <BookOpen />
              {siteConfig.hero.primaryCta.label}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={siteConfig.hero.secondaryCta.href}>
              <PenLine />
              {siteConfig.hero.secondaryCta.label}
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
