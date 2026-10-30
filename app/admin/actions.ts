"use server";

/* 관리자 페이지의 버튼들이 실제로 하는 일 (서버에서 실행됨)
   - login / logout      : 로그인, 로그아웃
   - saveItem            : 카드 추가 또는 수정 (이미지 업로드 포함)
   - deleteItem          : 카드 삭제
   - saveHero            : 첫 화면(히어로) 글자 저장
   - saveWebtoon / deleteWebtoon : 요일별 웹툰 추가·수정 / 삭제
   - uploadEpisodeImage / saveEpisode / deleteEpisode : 웹툰 회차 그림 올리기 / 회차 저장 / 삭제 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { siteConfig } from "@/site.config";
import { checkPassword, endAdminSession, isAdmin, startAdminSession } from "@/lib/admin-auth";
import { getAdminClient, IMAGE_BUCKET } from "@/lib/supabase-admin";

export type ActionState = { ok?: boolean; message?: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/* ---------- 로그인 / 로그아웃 ---------- */

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    return { message: "비밀번호가 올바르지 않습니다." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin");
}

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

/* ---------- 웹툰 저장 (추가 / 수정) ---------- */

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export async function saveWebtoon(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다. .env.local 을 확인하세요." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const weekday = String(formData.get("weekday") ?? "");
  const isUp = formData.get("is_up") === "on";
  const isVisible = formData.get("is_visible") === "on";
  const removeCover = formData.get("remove_cover") === "on";
  const cover = formData.get("cover");

  if (!title) return { message: "제목을 입력하세요." };
  if (!WEEKDAYS.includes(weekday)) return { message: "요일을 골라 주세요." };

  const row: Record<string, unknown> = {
    title,
    weekday,
    is_up: isUp,
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

  const { error } = id
    ? await supabase.from("webtoons").update(row).eq("id", id)
    : await supabase.from("webtoons").insert(row);

  if (error) return { message: `저장 실패: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: id ? "수정했습니다." : "추가했습니다." };
}

/* ---------- 웹툰 삭제 ---------- */

export async function deleteWebtoon(formData: FormData) {
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  const coverUrl = String(formData.get("cover_url") ?? "");
  if (!id) return;

  await supabase.from("webtoons").delete().eq("id", id);

  // 연결된 표지 파일도 저장소에서 정리
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  if (coverUrl.includes(marker)) {
    await supabase.storage.from(IMAGE_BUCKET).remove([coverUrl.split(marker)[1]]);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

/* ---------- 웹툰 회차 ---------- */

// 그림은 한 장씩 따로 올립니다. (인터넷 배포(Vercel)에서는 한 번에 보낼 수 있는 크기가 약 4.5MB라서)
const MAX_EPISODE_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

/** 회차 그림 한 장 올리기 → 그림 주소를 돌려줌 */
export async function uploadEpisodeImage(formData: FormData): Promise<UploadResult> {
  if (!(await isAdmin())) return { ok: false, message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { ok: false, message: "Supabase가 연결되지 않았습니다." };

  const webtoonId = String(formData.get("webtoon_id") ?? "");
  const file = formData.get("file");
  if (!webtoonId) return { ok: false, message: "웹툰 정보가 없습니다." };
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
  if (!(await isAdmin())) return { message: "로그인이 필요합니다. 새로고침 후 다시 로그인하세요." };
  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const title = input.title.trim();
  if (!input.webtoonId) return { message: "웹툰 정보가 없습니다." };
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
  if (!(await isAdmin())) return;
  const supabase = getAdminClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data } = await supabase.from("episodes").select("image_urls").eq("id", id).maybeSingle();
  await supabase.from("episodes").delete().eq("id", id);

  const marker = `/object/public/${IMAGE_BUCKET}/`;
  const paths = ((data?.image_urls as string[] | undefined) ?? [])
    .filter((url) => url.includes(marker))
    .map((url) => url.split(marker)[1]);
  if (paths.length > 0) await supabase.storage.from(IMAGE_BUCKET).remove(paths);

  revalidatePath("/", "layout");
}
