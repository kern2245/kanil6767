import { getAds } from "@/lib/data";
import { Container } from "@/components/layout/container";
import { AdCarousel } from "@/components/sections/ad-carousel";

/** 광고판 섹션 (예전 TEA TIME 칸 자리).
    광고판은 회장 페이지(/admin)의 "광고판" 탭에서 추가·수정·삭제합니다. 5초마다 다음 장으로 넘어가요. */
export async function AdBoard() {
  const ads = await getAds();

  return (
    <section id="contact" className="scroll-mt-16 py-24">
      <Container>
        <AdCarousel ads={ads} />
      </Container>
    </section>
  );
}
