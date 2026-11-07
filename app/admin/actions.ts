"use server";

/* 관리자·작가 페이지의 버튼들이 실제로 하는 일 (서버에서 실행됨)
   - startGithubLogin / logout : 회장 GitHub 로그인 시작, 로그아웃
   - artistSignup / artistLogin / artistLogout / changeArtistPassword : 작가 가입·로그인·로그아웃·비밀번호 바꾸기
   - saveItem / deleteItem : 카드 추가·수정 / 삭제 (회장만)
   - saveHero            : 첫 화면(히어로) 글자 저장 (회장만)
   - saveContactTexts    : (예전) TEA TIME 칸 글자 저장 — 지금은 광고판으로 바뀌어 안 씀
   - saveAd / deleteAd   : 광고판 추가·수정 / 삭제 (회장만)
   - saveWebtoon / deleteWebtoon : 웹툰 추가·수정 / 삭제 (회장 또는 그 웹툰을 올린 작가)
   - uploadEpisodeImage / saveEpisode / deleteEpisode : 회차 그림 올리기 / 저장 / 삭제 (회장 또는 그 웹툰의 작가)
   - approveArtist / blockArtist / deleteArtist : 작가 계정 승인 / 막기 / 삭제 (회장만) */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { siteConfig } from "@/site.config";
import { getAuthClient } from "@/lib/supabase-auth";
import {
  changeOwnArtistPassword,
  endAdminSession,
  endArtistSession,
  getApprovedArtistId,
  getCurrentArtist,
  isAdmin,
  loginArtist,
  registerArtist,
} from "@/lib/admin-auth";
import { getAdminClient, IMAGE_BUCKET } from "@/lib/supabase-admin";

export type ActionState = { ok?: boolean; message?: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/* ---------- 회장 로그인 (GitHub) / 로그아웃 ----------
   회장 비밀번호로는 더 이상 들어갈 수 없고, site.config.ts 의 ownerGithubLogin 계정으로
   "GitHub로 로그인" 했을 때만 회장이 됩니다. 확인은 app/auth/callback/route.ts 에서. */

export async function startGithubLogin() {
  const supabase = await getAuthClient();
  if (!supabase) redirect("/admin?error=supabase");

  // 지금 접속한 주소(내 컴퓨터 / 인터넷 사이트)로 다시 돌아오게
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${proto}://${host}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data.url) redirect("/admin?error=github");
  redirect(data.url);
}

export async function logout() {
  await endAdminSession();
  redirect("/admin");
}

/* ---------- 작가 가입 / 로그인 / 로그아웃 ---------- */

function readNewPassword(formData: FormData): { password?: string; message?: string } {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 4) return { message: "비밀번호는 4글자 이상으로 정해 주세요." };
  if (password !== confirm) return { message: "두 칸의 비밀번호가 서로 다릅니다." };
  return { password };
}

/** 작가 가입 → 승인 대기 상태로 로그인됨 (회장이 승인해야 웹툰을 올릴 수 있음) */
export async function artistSignup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: "이메일 주소를 정확히 입력해 주세요." };
  if (!name) return { message: "작가 이름을 입력해 주세요." };
  const { password, message } = readNewPassword(formData);
  if (!password) return { message };

  const result = await registerArtist(email, name, password);
  if (!result.ok) return { message: result.message };
  revalidatePath("/admin");
  redirect("/artist");
}

export async function artistLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await loginArtist(email, password);
  if (!result.ok) return { message: result.message };
  redirect("/artist");
}

export async function artistLogout() {
  await endArtistSession();
  redirect("/artist");
}

/** 작가 본인 비밀번호 바꾸기 */
export async function changeArtistPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const artist = await getCurrentArtist();
  if (!artist || artist.status === "blocked") return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const { password, message } = readNewPassword(formData);
  if (!password) return { message };

  const result = await changeOwnArtistPassword(artist.id, password);
  if (!result.ok) return { message: result.message };
  return { ok: true, message: "비밀번호를 바꿨습니다." };
}

/* ---------- 웹툰을 다룰 수 있는 사람 확인 ----------
   - 회장: 모든 웹툰
   - 승인된 작가: 자기가 올린 웹툰만 (artist_id 가 자기 것) */

type Editor = { admin: true } | { admin: false; artistId: string };

async function getEditor(): Promise<Editor | null> {
  if (await isAdmin()) return { admin: true };
  const artistId = await getApprovedArtistId();
  return artistId ? { admin: false, artistId } : null;
}

/** 이 웹툰을 다룰 수 있는지 (회장은 항상, 작가는 자기 웹툰만) */
async function canEditWebtoon(editor: Editor, webtoonId: string) {
  if (editor.admin) return true;
  const supabase = getAdminClient();
  if (!supabase) return false;
  const { data } = await supabase.from("webtoons").select("artist_id").eq("id", webtoonId).maybeSingle();
  return Boolean(data) && data!.artist_id === editor.artistId;
}

const NO_PERMISSION = "로그인이 필요하거나, 내가 올린 웹툰이 아닙니다.";

/* ---------- 카드 저장 (추가 / 수정) ---------- */

export async function saveItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  const id = String(formData.get("id") ?? "");
  const section = String(formData.get("section") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0) || 0;
  const isVisible = formData.get("is_visible") === "on";
  const removeImage = formData.get("remove_image") === "on";
  const image = formData.get("image");

  if (!siteConfig.adminSections.some((s) => s.key === section)) {
    return { message: "알 수 없는 섹션입니다." };
  }
  if (!title) return { message: "제목을 입력하세요." };

  const row: Record<string, unknown> = {
    section,
    title,
    description: description || null,
    link_url: linkUrl || null,
    sort_order: sortOrder,
    is_visible: isVisible,
  };

  // 새 이미지를 올린 경우 → Supabase 저장소에 업로드
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) return { message: "이미지 파일만 올릴 수 있습니다." };
    if (image.size > MAX_IMAGE_BYTES) return { message: "이미지는 5MB 이하만 올릴 수 있습니다." };

    const ext = (image.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${section}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, image, { contentType: image.type, upsert: false });
    if (uploadError) return { message: `이미지 업로드 실패: ${uploadError.message}` };

    row.image_url = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  } else if (removeImage) {
    row.image_url = null;
  }

  const { error } = id
    ? await supabase.from("items").update(row).eq("id", id)
    : await supabase.from("items").insert(row);

  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: id ? "수정했습니다." : "추가했습니다." };
}

/* ---------- 카드 삭제 ---------- */

export async function deleteItem(formData: FormData) {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "");
  if (!id) return;

  await supabase.from("items").delete().eq("id", id);

  // 연결된 이미지 파일도 저장소에서 정리
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  if (imageUrl.includes(marker)) {
    await supabase.storage.from(IMAGE_BUCKET).remove([imageUrl.split(marker)[1]]);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

/* ---------- 히어로 글자 저장 ---------- */

export async function saveHero(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  // 빈 칸은 null 로 저장 → 사이트에는 site.config.ts 의 기본 글자가 보임
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;

  const { error } = await supabase.from("hero").upsert({
    id: 1,
    eyebrow: text("eyebrow"),
    title: text("title"),
    description: text("description"),
    primary_label: text("primary_label"),
    secondary_label: text("secondary_label"),
    updated_at: new Date().toISOString(),
  });

  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "저장했습니다." };
}

/* ---------- TEA TIME(연락처) 칸 글자 저장 (회장만) ---------- */

export async function saveContactTexts(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  // 빈 칸은 null 로 저장 → 사이트에는 site.config.ts 의 기본 글자가 보임
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;

  const { error } = await supabase.from("contact_texts").upsert({
    id: 1,
    eyebrow: text("eyebrow"),
    title: text("title"),
    description: text("description"),
    updated_at: new Date().toISOString(),
  });

  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "저장했습니다." };
}

/* ---------- 웹툰 저장 (추가 / 수정) ---------- */

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export async function saveWebtoon(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const editor = await getEditor();
  if (!editor) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  const id = String(formData.get("id") ?? "");
  // 수정은 회장 또는 그 웹툰을 올린 작가만
  if (id && !(await canEditWebtoon(editor, id))) return { message: NO_PERMISSION };
  const title = String(formData.get("title") ?? "").trim();
  const weekday = String(formData.get("weekday") ?? "");
  const isUp = formData.get("is_up") === "on";
  const isCompleted = formData.get("is_completed") === "on";
  const isVisible = formData.get("is_visible") === "on";
  const removeCover = formData.get("remove_cover") === "on";
  const cover = formData.get("cover");

  if (!title) return { message: "제목을 입력하세요." };
  if (!WEEKDAYS.includes(weekday)) return { message: "요일을 골라 주세요." };

  const row: Record<string, unknown> = {
    title,
    weekday,
    is_up: isUp,
    is_completed: isCompleted,
    is_visible: isVisible,
  };

  // 새 표지를 올린 경우 → Supabase 저장소의 webtoons/ 폴더에 업로드
  if (cover instanceof File && cover.size > 0) {
    if (!cover.type.startsWith("image/")) return { message: "이미지 파일만 올릴 수 있습니다." };
    if (cover.size > MAX_IMAGE_BYTES) return { message: "이미지는 5MB 이하만 올릴 수 있습니다." };

    const ext = (cover.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `webtoons/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, cover, { contentType: cover.type, upsert: false });
    if (uploadError) return { message: `표지 업로드 실패: ${uploadError.message}` };

    row.cover_url = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  } else if (removeCover) {
    row.cover_url = null;
  }

  // 작가가 새로 추가하면 그 작가의 웹툰으로 기록
  if (!id && !editor.admin) row.artist_id = editor.artistId;

  const { error } = id
    ? await supabase.from("webtoons").update(row).eq("id", id)
    : await supabase.from("webtoons").insert(row);

  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/artist");
  return { ok: true, message: id ? "수정했습니다." : "추가했습니다." };
}

/* ---------- 웹툰 삭제 ---------- */

export async function deleteWebtoon(formData: FormData) {
  // 삭제는 회장 또는 그 웹툰을 올린 작가만
  const editor = await getEditor();
  if (!editor) return;
  const supabase = getAdminClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  const coverUrl = String(formData.get("cover_url") ?? "");
  if (!id || !(await canEditWebtoon(editor, id))) return;

  await supabase.from("webtoons").delete().eq("id", id);

  // 연결된 표지 파일도 저장소에서 정리
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  if (coverUrl.includes(marker)) {
    await supabase.storage.from(IMAGE_BUCKET).remove([coverUrl.split(marker)[1]]);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/artist");
}

/* ---------- 웹툰 회차 ---------- */

// 그림은 한 장씩 따로 올립니다. (인터넷 배포(Vercel)에서는 한 번에 보낼 수 있는 크기가 약 4.5MB라서)
const MAX_EPISODE_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

/** 회차 그림 한 장 올리기 → 그림 주소를 돌려줌 */
export async function uploadEpisodeImage(formData: FormData): Promise<UploadResult> {
  const editor = await getEditor();
  if (!editor) return { ok: false, message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, message: "Supabase가 연결되지 않았습니다." };

  const webtoonId = String(formData.get("webtoon_id") ?? "");
  const file = formData.get("file");
  if (!webtoonId) return { ok: false, message: "웹툰 정보가 없습니다." };
  if (!(await canEditWebtoon(editor, webtoonId))) return { ok: false, message: NO_PERMISSION };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "그림 파일이 없습니다." };
  if (!file.type.startsWith("image/")) return { ok: false, message: `${file.name}: 이미지 파일만 올릴 수 있습니다.` };
  if (file.size > MAX_EPISODE_IMAGE_BYTES) return { ok: false, message: `${file.name}: 한 장에 4MB 이하만 올릴 수 있습니다.` };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `episodes/${webtoonId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, message: `${file.name} 업로드 실패: ${error.message}` };

  return { ok: true, url: supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl };
}

/** 회차 저장 (그림을 다 올린 뒤 호출) */
export async function saveEpisode(input: {
  webtoonId: string;
  number: number;
  title: string;
  imageUrls: string[];
}): Promise<ActionState> {
  const editor = await getEditor();
  if (!editor) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const title = input.title.trim();
  if (!input.webtoonId) return { message: "웹툰 정보가 없습니다." };
  if (!(await canEditWebtoon(editor, input.webtoonId))) return { message: NO_PERMISSION };
  if (!Number.isInteger(input.number) || input.number < 1) return { message: "회차 번호는 1 이상 숫자로 입력하세요." };
  if (!title) return { message: "회차 제목을 입력하세요." };

  const { error } = await supabase.from("episodes").insert({
    webtoon_id: input.webtoonId,
    number: input.number,
    title,
    image_urls: input.imageUrls,
  });
  if (error) {
    if (error.code === "23505") return { message: `${input.number}화는 이미 있습니다. 다른 번호를 쓰세요.` };
    return { message: `저장 실패: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: `${input.number}화를 올렸습니다.` };
}

/** 회차 삭제 (그림 파일도 함께 정리) */
export async function deleteEpisode(formData: FormData) {
  // 삭제는 회장 또는 그 웹툰을 올린 작가만
  const editor = await getEditor();
  if (!editor) return;
  const supabase = getAdminClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data } = await supabase.from("episodes").select("image_urls, webtoon_id").eq("id", id).maybeSingle();
  if (!data || !(await canEditWebtoon(editor, data.webtoon_id as string))) return;
  await supabase.from("episodes").delete().eq("id", id);

  const marker = `/object/public/${IMAGE_BUCKET}/`;
  const paths = ((data?.image_urls as string[] | undefined) ?? [])
    .filter((url) => url.includes(marker))
    .map((url) => url.split(marker)[1]);
  if (paths.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(paths);

  revalidatePath("/", "layout");
}

/* ---------- 작가 계정 관리 (회장만): 승인 / 막기 / 삭제 ---------- */

async function setArtistStatus(formData: FormData, status: "approved" | "blocked") {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  if (!supabase) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("artists").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

/** 승인: 그 작가가 웹툰을 올릴 수 있게 됨 */
export async function approveArtist(formData: FormData) {
  await setArtistStatus(formData, "approved");
}

/** 막기: 그 작가는 로그인도, 웹툰 올리기도 못 함 (올린 웹툰은 그대로 남음) */
export async function blockArtist(formData: FormData) {
  await setArtistStatus(formData, "blocked");
}

/** 삭제: 작가 계정을 지움. 그 작가가 올린 웹툰은 남고, 회장만 관리하는 웹툰이 됨 */
export async function deleteArtist(formData: FormData) {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  if (!supabase) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("artists").delete().eq("id", id);
  revalidatePath("/admin");
}

/* ---------- 광고판 추가·수정 / 삭제 (회장만) ---------- */

export async function saveAd(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  const id = String(formData.get("id") ?? "");
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const title = text("title");
  const linkUrl = text("link_url");
  if (!title) return { message: "제목을 입력하세요." };
  // 링크는 https:// 로 시작하는 주소나, 사이트 안 주소(/webtoon/... 등)만
  if (linkUrl && !/^https?:\/\//.test(linkUrl) && !linkUrl.startsWith("/")) {
    return { message: "링크는 https:// 로 시작하거나 / 로 시작해야 해요." };
  }

  const row = {
    eyebrow: text("eyebrow") || null,
    title,
    description: text("description") || null,
    link_url: linkUrl || null,
    is_visible: formData.get("is_visible") === "on",
  };

  const { error } = id
    ? await supabase.from("ads").update(row).eq("id", id)
    : await supabase.from("ads").insert(row);
  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: id ? "수정했습니다." : "추가했습니다." };
}

export async function deleteAd(formData: FormData) {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  if (!supabase) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("ads").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin");
}
