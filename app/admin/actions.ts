"use server";

/* 관리자·작가 페이지의 버튼들이 실제로 하는 일 (서버에서 실행됨)
   - startGithubLogin / logout : 회장 GitHub 로그인 시작, 로그아웃
   - artistLogout : 회원 로그아웃 (가입·로그인·비밀번호·닉네임 바꾸기는 app/login/actions.ts — 해킹 막기 규칙 적용)
   - saveItem / deleteItem : 카드 추가·수정 / 삭제 (회장만)
   - saveHero            : 첫 화면(히어로) 글자 저장 (회장만)
   - saveContactTexts    : (예전) TEA TIME 칸 글자 저장 — 지금은 광고판으로 바뀌어 안 씀
   - saveAd / deleteAd   : 광고판 추가·수정 / 삭제 (회장만)
   - saveWebtoon / deleteWebtoon : 웹툰 추가·수정 / 삭제 (회장 또는 그 웹툰을 올린 작가)
   - setWebtoonCompleted : 완결로 넘기기 / 연재로 되돌리기 (회장만)
   - updateWebtoonCover  : 표지만 바꾸기 / 무프사로 (회장 또는 그 웹툰을 올린 작가)
   - updateEpisodeThumbnail : 회차 썸네일 바꾸기 / 무프사로 (회장 또는 그 웹툰의 작가)
   - updateEpisodePublishAt : 예약 회차 공개 날짜 바꾸기(1년 안) / 지금 바로 공개 (회장 또는 그 웹툰의 작가)
   - uploadEpisodeImage / saveEpisode / deleteEpisode : 회차 그림 올리기 / 저장 / 삭제 (회장 또는 그 웹툰의 작가)
   - approveArtist / demoteArtist / blockArtist / deleteArtist : 회원을 작가로 승급 / 독자로 / 막기 / 삭제 (회장만)
   - adminDeleteCommunityPosts / adminDeleteCommunityPost / adminDeleteCommunityComment : 작가 커뮤니티 글·댓글 지우기 (회장만) */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { siteConfig } from "@/site.config";
import { getAuthClient } from "@/lib/supabase-auth";
import { endAdminSession, endArtistSession, getApprovedArtistId, isAdmin } from "@/lib/admin-auth";
import { getAdminClient, IMAGE_BUCKET } from "@/lib/supabase-admin";
import { IMAGE_ONLY_MESSAGE, imageExtension, isAllowedImage } from "@/lib/image-check";
import { formatPublishAt, nextPublishAt, parsePublishChoice } from "@/lib/publish-time";
import type { Weekday } from "@/lib/types";

/** 버튼 결과. id: 새로 만든 웹툰 번호 (새 웹툰 만들기에서 1화를 이어서 올릴 때 씀) */
export type ActionState = { ok?: boolean; message?: string; id?: string };

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

/* ---------- 회원 로그아웃 ---------- */

export async function artistLogout() {
  await endArtistSession();
  redirect("/artist");
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
    if (!isAllowedImage(image)) return { message: IMAGE_ONLY_MESSAGE };
    if (image.size > MAX_IMAGE_BYTES) return { message: "이미지는 5MB 이하만 올릴 수 있습니다." };

    const ext = imageExtension(image);
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
  const isVisible = formData.get("is_visible") === "on";
  const removeCover = formData.get("remove_cover") === "on";
  const cover = formData.get("cover");

  if (!title) return { message: "제목을 입력하세요." };
  if (!WEEKDAYS.includes(weekday)) return { message: "요일을 골라 주세요." };

  const row: Record<string, unknown> = {
    title,
    weekday,
    is_visible: isVisible,
  };
  // 완결 상태는 여기서 안 바꿈 → 회장 페이지의 "완결로 넘기기" 버튼(setWebtoonCompleted)으로만

  // 새 표지를 올린 경우 → Supabase 저장소의 webtoons/ 폴더에 업로드
  if (cover instanceof File && cover.size > 0) {
    if (!isAllowedImage(cover)) return { message: IMAGE_ONLY_MESSAGE };
    if (cover.size > MAX_IMAGE_BYTES) return { message: "이미지는 5MB 이하만 올릴 수 있습니다." };

    const ext = imageExtension(cover);
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

  // 새로 만들면 만든 웹툰 번호(newId)를 돌려줌 → "새 웹툰 만들기"에서 1화를 바로 이어서 올림
  let newId: string | undefined;
  let error: { message: string } | null = null;
  if (id) {
    ({ error } = await supabase.from("webtoons").update(row).eq("id", id));
  } else {
    const inserted = await supabase.from("webtoons").insert(row).select("id").single();
    error = inserted.error;
    newId = (inserted.data?.id as string | undefined) ?? undefined;
  }

  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/artist");
  return { ok: true, message: id ? "수정했습니다." : "웹툰을 만들었습니다.", id: id || newId };
}

/* ---------- 표지만 바꾸기 / 지우기 (웹툰 목록의 표지 버튼) ----------
   - cover 파일이 있으면: 새 표지로 바꿈
   - remove=on 이면: 표지 지움 (사이트에는 기본 그림 아이콘이 보임)
   예전 표지 파일은 저장소에서 정리합니다. */

export async function updateWebtoonCover(formData: FormData): Promise<ActionState> {
  const editor = await getEditor();
  if (!editor) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const id = String(formData.get("id") ?? "");
  if (!id || !(await canEditWebtoon(editor, id))) return { message: NO_PERMISSION };

  const remove = formData.get("remove") === "on";
  const cover = formData.get("cover");
  const { data: current } = await supabase.from("webtoons").select("cover_url").eq("id", id).maybeSingle();
  const oldUrl = (current?.cover_url as string | null) ?? null;

  let newUrl: string | null = null;
  if (!remove) {
    if (!(cover instanceof File) || cover.size === 0) return { message: "표지 그림을 골라 주세요." };
    if (!isAllowedImage(cover)) return { message: IMAGE_ONLY_MESSAGE };
    if (cover.size > MAX_IMAGE_BYTES) return { message: "이미지는 5MB 이하만 올릴 수 있습니다." };

    const ext = imageExtension(cover);
    const path = `webtoons/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, cover, { contentType: cover.type, upsert: false });
    if (uploadError) return { message: `표지 업로드 실패: ${uploadError.message}` };
    newUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("webtoons").update({ cover_url: newUrl }).eq("id", id);
  if (error) return { message: `저장 실패: ${error.message}` };

  // 예전 표지 파일 정리
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  if (oldUrl && oldUrl.includes(marker)) {
    await supabase.storage.from(IMAGE_BUCKET).remove([oldUrl.split(marker)[1]]);
  }

  revalidatePath("/", "layout");
  return { ok: true, message: remove ? "무프사로 바꿨습니다." : "표지를 바꿨습니다." };
}

/* ---------- 완결로 넘기기 / 연재로 되돌리기 (회장만) ---------- */

export async function setWebtoonCompleted(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!supabase || !id) return;
  await supabase
    .from("webtoons")
    .update({ is_completed: formData.get("completed") === "on" })
    .eq("id", id);
  revalidatePath("/", "layout");
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
  if (!isAllowedImage(file)) return { ok: false, message: `${file.name}: ${IMAGE_ONLY_MESSAGE}` };
  if (file.size > MAX_EPISODE_IMAGE_BYTES) return { ok: false, message: `${file.name}: 한 장에 4MB 이하만 올릴 수 있습니다.` };

  const ext = imageExtension(file);
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
  /** 회차 썸네일 (선택, 없으면 무프사) — uploadEpisodeImage 로 먼저 올린 주소 */
  thumbnailUrl?: string | null;
  /** 공개 날짜 (선택): "now" 또는 연재 요일 0시 날짜 — 안 보내면 다음 연재일 (lib/publish-time.ts) */
  publishAt?: string;
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

  // 공개 시간: 연재 요일 당일이면 바로, 아니면 다음 연재 요일 0시 (lib/publish-time.ts)
  const { data: webtoon } = await supabase
    .from("webtoons")
    .select("weekday, is_completed")
    .eq("id", input.webtoonId)
    .maybeSingle();
  if (!webtoon) return { message: "웹툰 정보를 찾지 못했습니다." };
  const now = new Date();
  const weekday = webtoon.weekday as Weekday;
  const completed = Boolean(webtoon.is_completed);
  // 고른 공개 날짜가 있으면 그 날짜(연재 요일 0시, 1년 안), 없으면 다음 연재일
  const publishAt = input.publishAt
    ? parsePublishChoice(input.publishAt, weekday, completed, now)
    : nextPublishAt(weekday, completed, now);
  if (!publishAt) return { message: "공개 날짜가 올바르지 않아요. 새로고침 후 다시 골라 주세요." };
  const scheduled = publishAt.getTime() > now.getTime();

  const { error } = await supabase.from("episodes").insert({
    webtoon_id: input.webtoonId,
    number: input.number,
    title,
    image_urls: input.imageUrls,
    thumbnail_url: input.thumbnailUrl || null,
    publish_at: publishAt.toISOString(),
  });
  if (error) {
    if (error.code === "23505") return { message: `${input.number}화는 이미 있습니다. 다른 번호를 쓰세요.` };
    return { message: `저장 실패: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: scheduled
      ? `${input.number}화를 올렸습니다. ${formatPublishAt(publishAt)}에 공개돼요. (그 전까지는 독자에게 안 보여요)`
      : `${input.number}화를 올렸습니다. 바로 공개됐어요.`,
  };
}

/** 예약 회차의 공개 날짜 바꾸기 / 지금 바로 공개
    formData: id(회차), publishAt("now" 또는 연재 요일 0시 날짜, 1년 안) */
export async function updateEpisodePublishAt(formData: FormData): Promise<ActionState> {
  const editor = await getEditor();
  if (!editor) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const id = String(formData.get("id") ?? "");
  const choice = String(formData.get("publishAt") ?? "");
  const { data: episode } = await supabase
    .from("episodes")
    .select("webtoon_id, number, webtoons(weekday, is_completed)")
    .eq("id", id)
    .maybeSingle();
  if (!episode || !(await canEditWebtoon(editor, episode.webtoon_id as string))) return { message: NO_PERMISSION };

  const webtoon = (Array.isArray(episode.webtoons) ? episode.webtoons[0] : episode.webtoons) as
    | { weekday: Weekday; is_completed: boolean | null }
    | null;
  if (!webtoon) return { message: "웹툰 정보를 찾지 못했습니다." };
  const now = new Date();
  const publishAt = parsePublishChoice(choice, webtoon.weekday, Boolean(webtoon.is_completed), now);
  if (!publishAt) return { message: "공개 날짜가 올바르지 않아요. 새로고침 후 다시 골라 주세요." };

  const { error } = await supabase.from("episodes").update({ publish_at: publishAt.toISOString() }).eq("id", id);
  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/", "layout");
  return {
    ok: true,
    message:
      publishAt.getTime() > now.getTime()
        ? `${episode.number}화를 ${formatPublishAt(publishAt)}에 공개하도록 바꿨어요.`
        : `${episode.number}화를 지금 바로 공개했어요.`,
  };
}

/** 회차 썸네일만 바꾸기 / 무프사로 (회차 목록의 썸네일 버튼)
    - thumbnail 파일이 있으면: 새 썸네일로 바꿈
    - remove=on 이면: 썸네일 빼고 무프사(기본 모양)로 */
export async function updateEpisodeThumbnail(formData: FormData): Promise<ActionState> {
  const editor = await getEditor();
  if (!editor) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const id = String(formData.get("id") ?? "");
  const { data: episode } = await supabase
    .from("episodes")
    .select("webtoon_id, thumbnail_url")
    .eq("id", id)
    .maybeSingle();
  if (!episode || !(await canEditWebtoon(editor, episode.webtoon_id as string))) return { message: NO_PERMISSION };

  const remove = formData.get("remove") === "on";
  const file = formData.get("thumbnail");
  let newUrl: string | null = null;
  if (!remove) {
    if (!(file instanceof File) || file.size === 0) return { message: "썸네일 그림을 골라 주세요." };
    if (!isAllowedImage(file)) return { message: IMAGE_ONLY_MESSAGE };
    if (file.size > MAX_EPISODE_IMAGE_BYTES) return { message: "썸네일은 4MB 이하만 올릴 수 있습니다." };

    const ext = imageExtension(file);
    const path = `episodes/${episode.webtoon_id}/thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) return { message: `썸네일 업로드 실패: ${uploadError.message}` };
    newUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("episodes").update({ thumbnail_url: newUrl }).eq("id", id);
  if (error) return { message: `저장 실패: ${error.message}` };

  // 예전 썸네일 파일 정리
  const oldUrl = (episode.thumbnail_url as string | null) ?? null;
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  if (oldUrl && oldUrl.includes(marker)) {
    await supabase.storage.from(IMAGE_BUCKET).remove([oldUrl.split(marker)[1]]);
  }

  revalidatePath("/", "layout");
  return { ok: true, message: remove ? "무프사로 바꿨습니다." : "썸네일을 바꿨습니다." };
}

/* ---------- 영어판 🌐 (외국 독자용) — 스튜디오 "영어판" 탭 ---------- */

/** 웹툰 영어 제목 저장 (비우면 영어 제목 없음 → 한국어 제목이 보임) */
export async function saveWebtoonTitleEn(formData: FormData): Promise<ActionState> {
  const editor = await getEditor();
  if (!editor) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };
  const id = String(formData.get("id") ?? "");
  const titleEn = String(formData.get("title_en") ?? "").trim().slice(0, 100);
  if (!id || !(await canEditWebtoon(editor, id))) return { message: NO_PERMISSION };
  const { error } = await supabase.from("webtoons").update({ title_en: titleEn || null }).eq("id", id);
  if (error) return { message: `저장 실패: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: titleEn ? "영어 제목을 저장했어요." : "영어 제목을 비웠어요." };
}

/** 회차 영어판 저장
    - titleEn: 영어 회차 제목 (빈 글자면 지움)
    - imageUrls: 새 영어판 그림 주소들 (undefined 면 그림은 그대로, [] 면 영어판 그림 빼기)
    바꾸거나 뺀 예전 영어판 그림 파일은 정리 */
export async function saveEpisodeEnglish(input: {
  episodeId: string;
  titleEn: string;
  imageUrls?: string[];
}): Promise<ActionState> {
  const editor = await getEditor();
  if (!editor) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const { data: episode } = await supabase
    .from("episodes")
    .select("webtoon_id, number, image_urls_en")
    .eq("id", input.episodeId)
    .maybeSingle();
  if (!episode || !(await canEditWebtoon(editor, episode.webtoon_id as string))) return { message: NO_PERMISSION };

  const update: { title_en: string | null; image_urls_en?: string[] } = {
    title_en: input.titleEn.trim().slice(0, 100) || null,
  };
  if (input.imageUrls) update.image_urls_en = input.imageUrls;
  const { error } = await supabase.from("episodes").update(update).eq("id", input.episodeId);
  if (error) return { message: `저장 실패: ${error.message}` };

  // 예전 영어판 그림 파일 정리 (그림을 바꾸거나 뺐을 때만)
  if (input.imageUrls) {
    const marker = `/object/public/${IMAGE_BUCKET}/`;
    const old = ((episode.image_urls_en as string[] | null) ?? []).filter(
      (url) => url.includes(marker) && !input.imageUrls!.includes(url),
    );
    if (old.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(old.map((url) => url.split(marker)[1]));
  }

  revalidatePath("/", "layout");
  const n = episode.number as number;
  if (input.imageUrls && input.imageUrls.length === 0) return { ok: true, message: `${n}화 영어판 그림을 뺐어요.` };
  if (input.imageUrls) return { ok: true, message: `${n}화 영어판을 저장했어요. (그림 ${input.imageUrls.length}장)` };
  return { ok: true, message: `${n}화 영어 제목을 저장했어요.` };
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

  const { data } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data || !(await canEditWebtoon(editor, data.webtoon_id as string))) return;
  await supabase.from("episodes").delete().eq("id", id);

  // 만화 그림 + 썸네일 파일 정리
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  const paths = [
    ...((data?.image_urls as string[] | undefined) ?? []),
    ...((data?.image_urls_en as string[] | undefined) ?? []),
    (data?.thumbnail_url as string | null) ?? "",
  ]
    .filter((url) => url.includes(marker))
    .map((url) => url.split(marker)[1]);
  if (paths.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(paths);

  revalidatePath("/", "layout");
}

/* ---------- 신고 처리 (회장만) — 회장 페이지 "신고" 탭 ----------
   - resolveReport: 처리 완료 (목록에서 빠짐)
   - deleteReportedComment: 신고된 댓글 지우기 + 처리 완료
   - hideReportedWebtoon: 신고된 웹툰(회차면 그 회차의 웹툰)을 사이트에서 숨기기 + 처리 완료 (지우지 않음, 웹툰 탭에서 되돌릴 수 있음) */

async function markReportDone(reportId: string) {
  const supabase = getAdminClient();
  if (!supabase || !reportId) return;
  await supabase.from("reports").update({ status: "done" }).eq("id", reportId);
}

export async function resolveReport(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  await markReportDone(String(formData.get("reportId") ?? ""));
  revalidatePath("/admin");
}

export async function deleteReportedComment(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  const commentId = String(formData.get("targetId") ?? "");
  if (!supabase || !commentId) return;
  await supabase.from("comments").delete().eq("id", commentId);
  // 같은 댓글에 대한 신고는 모두 처리 완료
  await supabase.from("reports").update({ status: "done" }).eq("target_type", "comment").eq("target_id", commentId);
  revalidatePath("/", "layout");
}

export async function hideReportedWebtoon(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  const webtoonId = String(formData.get("webtoonId") ?? "");
  if (!supabase || !webtoonId) return;
  await supabase.from("webtoons").update({ is_visible: false }).eq("id", webtoonId);
  await markReportDone(String(formData.get("reportId") ?? ""));
  revalidatePath("/", "layout");
}

/* ---------- 작가 커뮤니티 관리 (회장만) ----------
   회장 페이지 "커뮤니티" 탭: 글을 골라서 한꺼번에 지우기 / 글 하나 지우기 / 댓글 지우기
   (글을 지우면 그 글의 댓글도 함께 지워짐) */

function refreshCommunity() {
  revalidatePath("/admin");
  revalidatePath("/artist/community", "layout");
}

/** 체크한 글들을 한꺼번에 지우기 (ids 여러 개) */
export async function adminDeleteCommunityPosts(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  if (!supabase) return;
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;
  await supabase.from("community_posts").delete().in("id", ids);
  refreshCommunity();
}

/** 글 하나 지우기 */
export async function adminDeleteCommunityPost(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  const id = String(formData.get("postId") ?? "");
  if (!supabase || !id) return;
  await supabase.from("community_posts").delete().eq("id", id);
  refreshCommunity();
}

/** 댓글 하나 지우기 */
export async function adminDeleteCommunityComment(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  const id = String(formData.get("commentId") ?? "");
  if (!supabase || !id) return;
  await supabase.from("community_comments").delete().eq("id", id);
  refreshCommunity();
}

/* ---------- 작가 계정 관리 (회장만): 승인 / 막기 / 삭제 ---------- */

async function setArtistStatus(formData: FormData, status: "member" | "approved" | "blocked") {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  if (!supabase) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("artists").update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}

/** 작가로 승급: 그 회원이 웹툰을 올리고 작가 커뮤니티에 들어갈 수 있게 됨 */
export async function approveArtist(formData: FormData) {
  await setArtistStatus(formData, "approved");
}

/** 막기: 그 회원은 로그인도, 댓글·웹툰 올리기도 못 함 (올린 웹툰은 그대로 남음) */
export async function blockArtist(formData: FormData) {
  await setArtistStatus(formData, "blocked");
}

/** 독자로 내리기 (막기 풀기도 이걸로): 댓글만 달 수 있는 독자로 */
export async function demoteArtist(formData: FormData) {
  await setArtistStatus(formData, "member");
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
