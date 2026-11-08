import { siteConfig } from "@/site.config";
import { Container } from "@/components/layout/container";

/** 맨 아래 영역. 오른쪽에 "회장" · "작가" 버튼 (예전 작은 점(•) 숨은 버튼은 회장 버튼과 같아서 뺐어요) */
export function Footer() {
  return (
    <footer className="border-t border-border/60 py-10">
      <Container className="flex flex-col items-start justify-between gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p>{siteConfig.footer.copyright}</p>
        <div className="flex items-center gap-6">
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
          {/* 작가 버튼: 새 탭에서 작가 페이지 열기 (글자·주소는 site.config.ts 의 artistButton) */}
          <a
            href={siteConfig.artistButton.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            {siteConfig.artistButton.label}
          </a>
        </div>
      </Container>
    </footer>
  );
}
