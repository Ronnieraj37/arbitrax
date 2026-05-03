import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ botId: string }> };

function backendBase() {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_BACKEND_URL");
  return base.replace(/\/$/, "");
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { botId } = await params;
  const res = await fetch(`${backendBase()}/v1/bots/${botId}/workflow`, {
    headers: { "x-user-email": session.user.email },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { botId } = await params;
  const body = await req.json();
  const res = await fetch(`${backendBase()}/v1/bots/${botId}/workflow`, {
    method: "PATCH",
    headers: {
      "x-user-email": session.user.email,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
