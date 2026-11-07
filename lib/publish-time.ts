import type { Weekday } from "@/lib/types";

/* 회차 공개 시간 (예약 공개) — 모두 한국 시간 기준
   - 연재 요일 당일에 올리면: 바로 공개
   - 다른 날 올리면: 다음 연재 요일 0시에 공개 (예: 화요일에 금요웹툰을 올리면 → 그 주 금요일 0시)
   - 완결 웹툰은 요일이 없으니: 바로 공개 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 한국은 UTC+9 (서머타임 없음)
const WEEKDAY_INDEX: Record<Weekday, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** 이 웹툰 회차를 지금 올리면 언제 공개되는지 */
export function nextPublishAt(weekday: Weekday, isCompleted: boolean, now = new Date()): Date {
  if (isCompleted) return now;
  const kst = new Date(now.getTime() + KST_OFFSET_MS); // "한국 시계" 로 읽기 위해 9시간 더함 (UTC 함수로 읽음)
  const daysAhead = (WEEKDAY_INDEX[weekday] - kst.getUTCDay() + 7) % 7;
  if (daysAhead === 0) return now; // 오늘이 연재 요일
  const midnightKst = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + daysAhead);
  return new Date(midnightKst - KST_OFFSET_MS);
}

/** 공개 시간을 "11월 14일(금) 0시" 처럼 보여주기 */
export function formatPublishAt(value: string | Date): string {
  const kst = new Date(new Date(value).getTime() + KST_OFFSET_MS);
  const hour = kst.getUTCHours();
  const minute = kst.getUTCMinutes();
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일(${WEEKDAY_KO[kst.getUTCDay()]}) ${hour}시${minute ? ` ${minute}분` : ""}`;
}

/** 아직 공개 전(예약)인지 */
export function isScheduled(publishAt: string | null | undefined, now = new Date()): boolean {
  return Boolean(publishAt) && new Date(publishAt as string).getTime() > now.getTime();
}
