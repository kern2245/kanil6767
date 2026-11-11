import { LegalPage } from "@/components/sections/legal-page";
import { siteConfig } from "@/site.config";
import { getLang } from "@/lib/lang";
import { privacyEn } from "@/components/sections/legal-en";

/* 개인정보처리방침 (주소: /privacy) — 운영자 이름·이메일은 site.config.ts 의 legal 에서 바꿔요 */

export async function generateMetadata() {
  return { title: (await getLang()) === "ko" ? "개인정보처리방침" : "Privacy Policy" };
}

export default async function PrivacyPage() {
  // 영어 화면이면 영어 약관 (components/sections/legal-en.tsx)
  if ((await getLang()) === "en") {
    const en = privacyEn(siteConfig.legal.email);
    return <LegalPage lang="en" title="Privacy Policy" intro={en.intro} sections={en.sections} />;
  }
  const { serviceName, operator, email } = siteConfig.legal;
  return (
    <LegalPage
      title="개인정보처리방침"
      intro={`${serviceName}(이하 "사이트")는 회원의 개인정보를 소중히 여기며, 개인정보 보호법에 따라 어떤 정보를 왜 모으고 어떻게 지키는지 알려 드립니다.`}
      sections={[
        {
          title: "모으는 정보",
          body: (
            <ul>
              <li>구글로 로그인할 때: 이메일 주소, 이름, 프로필 사진</li>
              <li>사이트를 이용하면서: 닉네임, 올린 웹툰·댓글·커뮤니티 글, 좋아요·관심 웹툰·읽은 기록, 신고 내용</li>
              <li>자동으로 생기는 정보: 로그인 유지 쿠키, 조회수 중복을 막기 위한 익명 번호 쿠키, 로그인 실패 횟수</li>
            </ul>
          ),
        },
        {
          title: "쓰는 목적",
          body: (
            <ul>
              <li>회원 확인과 로그인 유지</li>
              <li>웹툰 올리기, 댓글·커뮤니티 등 사이트 기능 제공</li>
              <li>조회수·좋아요 조작, 해킹, 도배 같은 나쁜 이용 막기</li>
              <li>신고 처리와 문의 답변</li>
            </ul>
          ),
        },
        {
          title: "보관 기간",
          body: (
            <ul>
              <li>회원 정보는 탈퇴할 때까지 보관하고, 탈퇴하면 바로 지웁니다.</li>
              <li>로그인 쿠키는 회원 30일, 운영자 8시간이 지나면 끝납니다. 익명 번호 쿠키는 1년간 남습니다.</li>
              <li>법에서 보관하라고 정한 정보가 있으면 그 기간만큼 보관합니다.</li>
            </ul>
          ),
        },
        {
          title: "다른 곳에 주는 경우",
          body: <p>회원의 개인정보를 다른 사람이나 회사에 팔거나 주지 않습니다. 법에 따라 수사기관이 정식으로 요청하는 경우는 예외입니다.</p>,
        },
        {
          title: "맡기는 업체 (처리 위탁·국외 이전)",
          body: (
            <>
              <p>사이트 운영을 위해 아래 업체의 서버를 씁니다. 이 업체들의 서버는 해외에 있을 수 있으며, 사이트 이용 중 인터넷으로 정보가 옮겨집니다.</p>
              <ul>
                <li>Supabase Inc. (미국) — 회원 정보·게시물·그림 저장</li>
                <li>Vercel Inc. (미국) — 사이트 화면 제공</li>
                <li>Google LLC (미국) — 구글 로그인</li>
              </ul>
              <p>이전되는 정보는 제1조의 정보이며, 보관 기간은 제3조와 같습니다. 국외 이전을 원하지 않으면 가입하지 않거나 탈퇴할 수 있지만, 이 경우 로그인이 필요한 기능은 쓸 수 없습니다.</p>
            </>
          ),
        },
        {
          title: "회원의 권리",
          body: (
            <p>
              회원은 언제든 내 정보를 보거나, 고치거나, 지워 달라고 요청할 수 있습니다. 닉네임·프로필 사진은 &ldquo;설정&rdquo;에서 직접 바꿀 수 있고, 그 밖의 요청은 {email} 로 보내 주시면 바로 처리합니다.
            </p>
          ),
        },
        {
          title: "정보를 지키는 방법",
          body: (
            <ul>
              <li>모든 연결은 암호화(https)되고, 비밀번호는 알아볼 수 없게 바꿔서 저장합니다.</li>
              <li>데이터베이스는 운영자 서버만 접근할 수 있게 잠가 두었습니다.</li>
              <li>로그인을 여러 번 틀리면 잠시 잠그는 등 해킹을 막는 장치를 씁니다.</li>
            </ul>
          ),
        },
        {
          title: "만 14세 미만",
          body: <p>만 14세 미만은 보호자의 동의 없이 가입할 수 없습니다. 보호자 동의 없이 가입한 것이 확인되면 계정을 지웁니다.</p>,
        },
        {
          title: "개인정보 보호책임자",
          body: (
            <>
              <p>
                책임자: {operator} · 이메일: {email}
              </p>
              <p>
                개인정보 침해 상담은 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118)에도 할 수 있습니다.
              </p>
            </>
          ),
        },
        {
          title: "방침 변경",
          body: <p>이 방침을 바꿀 때는 시행 7일 전부터 사이트에 알립니다.</p>,
        },
      ]}
    />
  );
}
