"use server";

/* 회원 로그인 / 가입 / 로그아웃 (맨 위 "로그인" 버튼 → /login)
   독자·작가가 한 계정이에요. 가입하면 독자, 회장이 "작가로 승급"하면 작가. */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  changeOwnArtistPassword,
  changeOwnNickname,
  checkNewPassword,
  endArtistSession,
  getCurrentArtist,
  loginArtist,
  registerArtist,
} from "@/lib/admin-auth";
import { getAdminClient, IMAGE_BUCKET } from "@/lib/supabase-admin";

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
  const passwordError = checkNewPassword(password, confirm);
  if (passwordError) return { message: passwordError };

  const result = await registerArtist(email, name, password);
  if (!result.ok) return { message: result.message };
  revalidatePath("/", "layout");
  redirect(nextPath(formData));
}

/* ---------- 내 프사 바꾸기 / 무프사로 (로그인한 회원 본인) ---------- */

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3MB

export type AvatarResult = { ok?: boolean; message?: string };

export async function updateMyAvatar(formData: FormData): Promise<AvatarResult> {
  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") return { message: "로그인이 필요해요. 새로고침 후 다시 해 주세요." };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const remove = formData.get("remove") === "on";
  const file = formData.get("avatar");
  let newUrl: string | null = null;
  if (!remove) {
    if (!(file instanceof File) || file.size === 0) return { message: "프사로 쓸 그림을 골라 주세요." };
    if (!file.type.startsWith("image/")) return { message: "이미지 파일만 올릴 수 있어요." };
    if (file.size > MAX_AVATAR_BYTES) return { message: "프사는 3MB 이하만 올릴 수 있어요." };
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `avatars/${me.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return { message: `프사 올리기 실패: ${uploadError.message}` };
    newUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("artists").update({ avatar_url: newUrl }).eq("id", me.id);
  if (error) return { message: `저장 실패: ${error.message}` };

  // 예전 프사 파일 정리
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  if (me.avatar_url && me.avatar_url.includes(marker)) {
    await supabase.storage.from(IMAGE_BUCKET).remove([me.avatar_url.split(marker)[1]]);
  }

  revalidatePath("/", "layout");
  return { ok: true, message: remove ? "무프사로 바꿨어요." : "프사를 바꿨어요." };
}

/* ---------- 설정: 닉네임 / 비밀번호 바꾸기 (로그인한 회원 본인) ---------- */

export async function changeMyNickname(_prev: LoginState & { ok?: boolean }, formData: FormData) {
  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") return { message: "로그인이 필요해요. 새로고침 후 다시 해 주세요." };
  const result = await changeOwnNickname(me.id, String(formData.get("name") ?? ""));
  if (!result.ok) return { message: result.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "닉네임을 바꿨어요." };
}

export async function changeMyPassword(_prev: LoginState & { ok?: boolean }, formData: FormData) {
  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") return { message: "로그인이 필요해요. 새로고침 후 다시 해 주세요." };
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current) return { message: "지금 비밀번호를 입력해 주세요." };
  const passwordError = checkNewPassword(password, confirm);
  if (passwordError) return { message: passwordError };
  if (password === current) return { message: "지금 비밀번호와 다른 비밀번호로 정해 주세요." };
  const result = await changeOwnArtistPassword(me.id, current, password);
  if (!result.ok) return { message: result.message };
  return { ok: true, message: "비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요." };
}

export async function memberLogout() {
  await endArtistSession();
  revalidatePath("/", "layout");
  redirect("/");
}
