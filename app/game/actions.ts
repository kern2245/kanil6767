"use server";

/* 꼬미 키우기 세이브 (서버에서 실행됨)
   - loadGameSave  : 로그인 회원이면 서버에 저장된 내 게임 기록을 가져옴
   - storeGameSave : 로그인 회원이면 지금 게임 기록을 서버에 저장
   (로그인 안 했거나 막힌 계정은 저장 안 함. 저장 규칙은 lib/game-saves.ts) */

import { getCurrentArtist } from "@/lib/admin-auth";
import { cleanSave, readSave, writeSave, type GameSave } from "@/lib/game-saves";

export async function loadGameSave(): Promise<{ loggedIn: boolean; ready: boolean; data: GameSave | null }> {
  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") return { loggedIn: false, ready: false, data: null };
  const { ready, data } = await readSave(me.id);
  return { loggedIn: true, ready, data: data ? cleanSave(data) : null };
}

export async function storeGameSave(data: unknown): Promise<{ ok: boolean }> {
  const me = await getCurrentArtist();
  if (!me || me.status === "blocked") return { ok: false };
  const save = cleanSave(data);
  if (!save) return { ok: false };
  return { ok: await writeSave(me.id, save) };
}
