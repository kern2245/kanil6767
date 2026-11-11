import type { LegalSection } from "@/components/sections/legal-page";

/* 영어 이용약관 · 개인정보처리방침 (미국 독자용)
   - DMCA: 미국 저작권 신고 절차. 미국 저작권청에 "대리인(Designated Agent)"을 등록한 뒤
     아래 dmcaContact 를 그 정보로 바꾸면 돼요 (등록: dmca.copyright.gov)
   - COPPA: 13세 미만 가입 금지 / CCPA: 캘리포니아 개인정보 권리 */

export function termsEn(email: string): { intro: string; sections: LegalSection[] } {
  return {
    intro:
      'These Terms govern your use of Sekai (the "Service"), including reading, publishing webtoons, commenting, and community features. By using the Service, you agree to these Terms.',
    sections: [
      {
        title: "Accounts",
        body: (
          <ul>
            <li>You can sign up with a Google account. Your account is created the first time you sign in.</li>
            <li>You must be at least 13 years old to create an account.</li>
            <li>Keep your account to yourself. Do not share it or use someone else&apos;s account.</li>
            <li>Nicknames that impersonate staff or administrators are not allowed.</li>
          </ul>
        ),
      },
      {
        title: "Your content",
        body: (
          <ul>
            <li>You keep the copyright to the webtoons, images, and text you publish.</li>
            <li>
              You grant Sekai a non-exclusive, worldwide, royalty-free license to host, display, and promote your
              content on and for the Service. This license ends when you delete the content.
            </li>
            <li>The Service&apos;s design, logo, and software belong to Sekai.</li>
          </ul>
        ),
      },
      {
        title: "Prohibited content and conduct",
        body: (
          <ul>
            <li>Uploading anyone else&apos;s webtoons, artwork, or characters without permission</li>
            <li>Sexual content involving minors, illegal content, or extreme violence</li>
            <li>Harassment, hate speech, or sharing other people&apos;s personal information</li>
            <li>Spam, manipulating views or likes, or attempting to hack or disrupt the Service</li>
          </ul>
        ),
      },
      {
        title: "Copyright complaints (DMCA)",
        body: (
          <>
            <p>
              We respect copyright and respond to notices under the U.S. Digital Millennium Copyright Act. If you believe
              your work was posted without permission, use the &ldquo;Report&rdquo; button or email {email} with:
            </p>
            <ul>
              <li>your contact information and signature;</li>
              <li>the copyrighted work and the link to the infringing material;</li>
              <li>a statement that you have a good-faith belief the use is not authorized;</li>
              <li>a statement, under penalty of perjury, that your notice is accurate and you are the owner or authorized to act.</li>
            </ul>
            <p>
              We will remove the material promptly and notify the uploader, who may send a counter-notice. Accounts of
              repeat infringers will be terminated.
            </p>
          </>
        ),
      },
      {
        title: "Removal and suspension",
        body: (
          <ul>
            <li>We may hide or remove content that violates these Terms without prior notice.</li>
            <li>We may suspend accounts for serious or repeated violations.</li>
          </ul>
        ),
      },
      {
        title: "Deleting your account",
        body: <p>To delete your account, email {email}. We will delete your account and personal information.</p>,
      },
      {
        title: "Disclaimers",
        body: (
          <ul>
            <li>Users are responsible for the content they post.</li>
            <li>
              The Service is provided &ldquo;as is&rdquo; and free of charge. Features may change or be discontinued.
              To the extent permitted by law, Sekai is not liable for damages caused by events beyond its control.
            </li>
          </ul>
        ),
      },
      {
        title: "Changes",
        body: <p>We will post changes to these Terms at least 7 days before they take effect (30 days for changes that are unfavorable to you).</p>,
      },
    ],
  };
}

export function privacyEn(email: string): { intro: string; sections: LegalSection[] } {
  return {
    intro:
      "This Privacy Policy explains what information Sekai collects, why we collect it, and the choices you have.",
    sections: [
      {
        title: "Information we collect",
        body: (
          <ul>
            <li>From Google sign-in: email address, name, and profile picture</li>
            <li>When you use the Service: nickname, webtoons, comments, community posts, likes, favorites, reading history, and reports</li>
            <li>Automatically: a login cookie, an anonymous cookie to count views once per day, and failed-login counts</li>
          </ul>
        ),
      },
      {
        title: "How we use it",
        body: (
          <ul>
            <li>To sign you in and keep you signed in</li>
            <li>To provide publishing, comments, and community features</li>
            <li>To prevent abuse such as fake views, spam, and hacking</li>
            <li>To handle reports and answer questions</li>
          </ul>
        ),
      },
      {
        title: "Retention",
        body: (
          <ul>
            <li>We keep your account information until you delete your account.</li>
            <li>Login cookies expire after 30 days. The anonymous view cookie lasts one year.</li>
          </ul>
        ),
      },
      {
        title: "Sharing",
        body: (
          <>
            <p>We do not sell or share your personal information for advertising. We only disclose it when required by law.</p>
            <p>We use these service providers to run Sekai: Supabase Inc. (database and storage, USA), Vercel Inc. (hosting, USA), and Google LLC (sign-in, USA).</p>
          </>
        ),
      },
      {
        title: "Children's privacy (COPPA)",
        body: (
          <p>
            Sekai is not intended for children under 13, and we do not knowingly collect personal information from them.
            If you believe a child under 13 has created an account, contact {email} and we will delete it.
          </p>
        ),
      },
      {
        title: "Your rights, including California residents (CCPA)",
        body: (
          <>
            <p>
              You can access, correct, or delete your personal information at any time. You can change your nickname and
              profile picture in Settings; for anything else, email {email}.
            </p>
            <p>
              California residents have the right to know what personal information we collect, to request deletion, and
              to opt out of its sale. We do not sell personal information. We will not discriminate against you for
              exercising these rights.
            </p>
          </>
        ),
      },
      {
        title: "Security",
        body: (
          <ul>
            <li>All connections are encrypted (HTTPS), and passwords are stored in hashed form.</li>
            <li>The database can only be accessed by our server, and repeated failed logins are temporarily locked.</li>
          </ul>
        ),
      },
      {
        title: "Contact and changes",
        body: <p>Questions? Email {email}. We will post changes to this policy at least 7 days before they take effect.</p>,
      },
    ],
  };
}
