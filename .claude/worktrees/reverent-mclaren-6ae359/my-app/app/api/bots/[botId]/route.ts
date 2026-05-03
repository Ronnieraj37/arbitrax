import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ botId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { botId } = await params;
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base)
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_BACKEND_URL" },
      { status: 500 },
    );

  const res = await fetch(`${base.replace(/\/$/, "")}/v1/bots/${botId}`, {
    headers: { "x-user-email": session.user.email },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { botId } = await params;
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base)
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_BACKEND_URL" },
      { status: 500 },
    );

  const res = await fetch(`${base.replace(/\/$/, "")}/v1/bots/${botId}`, {
    method: "DELETE",
    headers: { "x-user-email": session.user.email },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
