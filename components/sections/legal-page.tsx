import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { siteConfig } from "@/site.config";
import { getDict, type Lang } from "@/lib/i18n";

/* 이용약관 · 개인정보처리방침 페이지가 같이 쓰는 모양 (제목 + 조항 목록)
   lang 이 "en" 이면 조항 번호·아래 운영자 칸도 영어로 */

export type LegalSection = { title: string; body: React.ReactNode };

export function LegalPage({
  title,
  intro,
  sections,
  lang = "ko",
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  lang?: Lang;
}) {
  const { legal } = siteConfig;
  const t = getDict(lang).legal;
  const effective = lang === "ko" ? legal.effectiveDate : "November 11, 2026";
  const operator = lang === "ko" ? legal.operator : "Sekai";
  return (
    <>
      <Navbar />
      <main className="flex-1 py-12">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.effective}: {effective}
          </p>
          <p className="mt-6 leading-relaxed text-muted-foreground">{intro}</p>

          <div className="mt-10 space-y-8">
            {sections.map((s, i) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold">{t.article(i + 1, s.title)}</h2>
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border p-5 text-sm text-muted-foreground">
            <p>
              {t.operator}: {operator}
            </p>
            <p>
              {t.contact}: {legal.email}
            </p>
            {legal.businessNumber ? (
              <p>
                {t.business}: {legal.businessNumber}
              </p>
            ) : null}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
