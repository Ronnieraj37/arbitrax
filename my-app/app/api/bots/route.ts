import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_BACKEND_URL" },
      { status: 500 },
    );
  }

  const res = await fetch(`${base.replace(/\/$/, "")}/v1/bots`, {
    headers: { "x-user-email": session.user.email },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_BACKEND_URL" },
      { status: 500 },
    );
  }

  const body = await req.json();
  const res = await fetch(`${base.replace(/\/$/, "")}/v1/bots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-email": session.user.email,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
