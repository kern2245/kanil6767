"use client";

import { Trash2 } from "lucide-react";

import { deleteArtist } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** 작가 계정 삭제 버튼 — 실수 방지를 위해 한 번 더 물어봅니다. 올린 웹툰은 남고 회장이 관리하게 됩니다. */
export function DeleteArtistButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteArtist}
      onSubmit={(e) => {
        if (!window.confirm(`${name} 작가 계정을 삭제할까요? 올린 웹툰은 남고, 회장이 관리하게 됩니다.`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
        <Trash2 />
        삭제
      </Button>
    </form>
  );
}
