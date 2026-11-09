"use server";

/* 신고하기 (로그인한 회원) — 웹툰 · 회차 · 댓글
   같은 회원이 같은 대상을 이미 신고해서 처리 전이면 또 신고되지 않음 (도배 방지).
   회장은 회장 페이지 "신고" 탭에서 처리 (app/admin/actions.ts 의 신고 처리) */

import { revalidatePath } from "next/cache";

import { getCurrentArtist } from "@/lib/admin-auth";
import { getAdminClient } from "@/lib/supabase-admin";

export type ReportState = { ok?: boolean; message?: string };

const TARGETS = ["webtoon", "episode", "comment"] as const;

export async function submitReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") return { message: "로그인한 회원만 신고할 수 있어요." };

  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 200);
  if (!TARGETS.includes(targetType as (typeof TARGETS)[number]) || !/^[0-9a-f-]{36}$/i.test(targetId)) {
    return { message: "신고할 대상을 찾지 못했어요." };
  }
  if (!reason) return { message: "신고 이유를 골라 주세요." };

  const supabase = getAdminClient();
  if (!supabase) return { message: "Supabase가 연결되지 않았습니다." };

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("reporter_id", me.id)
    .eq("status", "open")
    .limit(1);
  if ((existing ?? []).length > 0) return { ok: true, message: "이미 신고했어요. 회장이 확인할 거예요." };

  const { error } = await supabase.from("reports").insert({
    target_type: targetType,
    target_id: targetId,
    reporter_id: me.id,
    reason: detail ? `${reason} — ${detail}` : reason,
  });
  if (error) return { message: `신고 실패: ${error.message}` };

  revalidatePath("/admin");
  return { ok: true, message: "신고했어요. 회장이 확인할 거예요. 고마워요!" };
}
