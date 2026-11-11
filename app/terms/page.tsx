import { LegalPage } from "@/components/sections/legal-page";
import { siteConfig } from "@/site.config";
import { getLang } from "@/lib/lang";
import { termsEn } from "@/components/sections/legal-en";

/* 이용약관 (주소: /terms) — 운영자 이름·이메일은 site.config.ts 의 legal 에서 바꿔요 */

export async function generateMetadata() {
  return { title: (await getLang()) === "ko" ? "이용약관" : "Terms of Service" };
}

export default async function TermsPage() {
  // 영어 화면이면 영어 약관 (components/sections/legal-en.tsx)
  if ((await getLang()) === "en") {
    const en = termsEn(siteConfig.legal.email);
    return <LegalPage lang="en" title="Terms of Service" intro={en.intro} sections={en.sections} />;
  }
  const { serviceName, email } = siteConfig.legal;
  return (
    <LegalPage
      title="이용약관"
      intro={`이 약관은 ${serviceName}(이하 "사이트")에서 웹툰을 보고, 올리고, 댓글·커뮤니티를 이용할 때 지켜야 할 약속을 정합니다. 사이트를 이용하면 이 약관에 동의한 것으로 봅니다.`}
      sections={[
        {
          title: "회원 가입과 계정",
          body: (
            <ul>
              <li>회원 가입은 구글 계정으로 할 수 있으며, 처음 로그인하면 자동으로 가입됩니다.</li>
              <li>계정은 본인만 사용해야 하며, 남에게 빌려주거나 남의 계정을 쓰면 안 됩니다.</li>
              <li>운영자·관리자로 오해할 수 있는 닉네임은 쓸 수 없습니다.</li>
            </ul>
          ),
        },
        {
          title: "작품의 권리",
          body: (
            <ul>
              <li>회원이 올린 웹툰·그림·글의 저작권은 그것을 만든 회원에게 있습니다.</li>
              <li>회원은 사이트가 그 작품을 사이트 안에서 보여주고, 사이트를 소개하는 데 필요한 범위에서 쓸 수 있도록 허락합니다. 작품을 지우면 이 허락도 끝납니다.</li>
              <li>사이트의 디자인·로고·프로그램에 대한 권리는 운영자에게 있습니다.</li>
            </ul>
          ),
        },
        {
          title: "올리면 안 되는 것",
          body: (
            <ul>
              <li>남의 웹툰·그림·캐릭터 등 다른 사람의 저작물을 허락 없이 올리는 것</li>
              <li>음란물, 지나친 폭력, 불법 정보</li>
              <li>다른 사람을 괴롭히거나 욕하고, 개인정보를 퍼뜨리는 글</li>
              <li>광고 도배, 조회수·좋아요 조작, 사이트를 해킹하거나 방해하는 행동</li>
            </ul>
          ),
        },
        {
          title: "저작권 침해 신고",
          body: (
            <>
              <p>
                내 작품이 허락 없이 올라와 있다면 해당 작품의 &ldquo;신고&rdquo; 버튼을 누르거나 {email} 로 알려 주세요.
              </p>
              <p>운영자는 신고를 확인하면 해당 게시물을 바로 내리고, 올린 회원에게 알립니다. 올린 회원은 정당한 권리가 있다는 자료를 내고 다시 올려 달라고 요청할 수 있습니다.</p>
            </>
          ),
        },
        {
          title: "게시물 삭제와 이용 제한",
          body: (
            <ul>
              <li>이 약관을 어긴 게시물은 운영자가 미리 알리지 않고 숨기거나 지울 수 있습니다.</li>
              <li>여러 번 또는 심하게 어긴 회원은 계정 이용을 막을 수 있습니다.</li>
            </ul>
          ),
        },
        {
          title: "탈퇴",
          body: <p>탈퇴를 원하면 {email} 로 요청해 주세요. 확인 후 계정과 개인정보를 지웁니다.</p>,
        },
        {
          title: "책임",
          body: (
            <ul>
              <li>회원이 올린 게시물에 대한 책임은 올린 회원에게 있습니다.</li>
              <li>운영자는 천재지변, 서버 업체 장애 등 운영자가 어쩔 수 없는 사유로 생긴 손해에는 책임지지 않습니다.</li>
              <li>사이트는 무료로 제공되며, 서비스 내용은 바뀌거나 중단될 수 있습니다.</li>
            </ul>
          ),
        },
        {
          title: "약관 변경",
          body: <p>약관을 바꿀 때는 시행 7일 전부터 사이트에 알립니다. 회원에게 불리한 변경은 30일 전부터 알립니다.</p>,
        },
      ]}
    />
  );
}
