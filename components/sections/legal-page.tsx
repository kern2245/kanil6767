import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { siteConfig } from "@/site.config";

/* 이용약관 · 개인정보처리방침 페이지가 같이 쓰는 모양 (제목 + 조항 목록) */

export type LegalSection = { title: string; body: React.ReactNode };

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  const { legal } = siteConfig;
  return (
    <>
      <Navbar />
      <main className="flex-1 py-12">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">시행일: {legal.effectiveDate}</p>
          <p className="mt-6 leading-relaxed text-muted-foreground">{intro}</p>

          <div className="mt-10 space-y-8">
            {sections.map((s, i) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold">
                  제{i + 1}조 ({s.title})
                </h2>
                <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border p-5 text-sm text-muted-foreground">
            <p>운영자: {legal.operator}</p>
            <p>문의: {legal.email}</p>
            {legal.businessNumber ? <p>사업자 등록번호: {legal.businessNumber}</p> : null}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
