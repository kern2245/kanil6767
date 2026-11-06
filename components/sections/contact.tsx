import { getContactTexts } from "@/lib/data";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";

/** TEA TIME(연락처) 섹션.
    글자는 회장 페이지(/admin)의 "TEA TIME" 탭에서 바꿉니다. (비어 있으면 site.config.ts 의 contact 글자) */
export async function Contact() {
  const texts = await getContactTexts();

  return (
    <section id="contact" className="scroll-mt-16 py-24">
      <Container>
        <div className="rounded-2xl border bg-muted/50 px-6 py-16 text-center sm:px-12">
          <SectionHeader
            eyebrow={texts.eyebrow}
            title={texts.title}
            description={texts.description}
            className="mx-auto"
          />
        </div>
      </Container>
    </section>
  );
}
