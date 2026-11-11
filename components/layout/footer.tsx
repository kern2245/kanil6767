import { siteConfig } from "@/site.config";
import { Container } from "@/components/layout/container";
import { getT } from "@/lib/lang";

/** 맨 아래 영역. 오른쪽에 "회장" 버튼만 (작가 페이지는 맨 위 프사 → 설정 → 내 웹툰 스튜디오로 들어가요) */
export async function Footer() {
  const { lang, t } = await getT();
  return (
    <footer className="border-t border-border/60 py-10">
      <Container className="flex flex-col items-start justify-between gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p>{lang === "ko" ? siteConfig.footer.copyright : "© 2026 Sekai. All rights reserved."}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href="/terms" className="hover:text-foreground">
            {t.footer.terms}
          </a>
          <a href="/privacy" className="font-semibold hover:text-foreground">
            {t.footer.privacy}
          </a>
          {siteConfig.nav.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </a>
          ))}
          {/* 비밀 버튼: 새 탭에서 관리자 페이지 열기 (글자·주소는 site.config.ts 의 secretButton) */}
          <a
            href={siteConfig.secretButton.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            {siteConfig.secretButton.label}
          </a>
        </div>
      </Container>
    </footer>
  );
}
