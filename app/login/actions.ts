"use server";

/* 회원 로그인 / 가입 / 로그아웃 (맨 위 "로그인" 버튼 → /login)
   독자·작가가 한 계정이에요. 가입하면 독자, 회장이 "작가로 승급"하면 작가. */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endArtistSession, loginArtist, registerArtist } from "@/lib/admin-auth";

export type LoginState = { message?: string };

/** 로그인 뒤 돌아갈 주소 — 우리 사이트 안의 주소만 허용 (다른 사이트로 튀지 않게) */
function nextPath(formData: FormData) {
  const next = String(formData.get("next") ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function memberLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await loginArtist(email, password);
  if (!result.ok) return { message: result.message };
  revalidatePath("/", "layout");
  redirect(nextPath(formData));
}

export async function memberSignup(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: "이메일 주소를 정확히 입력해 주세요." };
  if (!name) return { message: "닉네임을 입력해 주세요." };
  if (name.length > 20) return { message: "닉네임은 20글자까지 쓸 수 있어요." };
  if (password.length < 4) return { message: "비밀번호는 4글자 이상으로 정해 주세요." };
  if (password !== confirm) return { message: "두 칸의 비밀번호가 서로 다릅니다." };

  const result = await registerArtist(email, name, password);
  if (!result.ok) return { message: result.message };
  revalidatePath("/", "layout");
  redirect(nextPath(formData));
}

export async function memberLogout() {
  await endArtistSession();
  revalidatePath("/", "layout");
  redirect("/");
}
