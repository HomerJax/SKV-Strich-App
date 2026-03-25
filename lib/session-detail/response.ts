import { NextResponse } from "next/server";

export function ok(data: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(error: string, status = 400, data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...data }, { status });
}