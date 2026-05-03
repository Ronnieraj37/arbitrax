import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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

  const formData = await req.formData();
  const marketType = (formData.get("marketType") as string) ?? "both";
  const name = (formData.get("name") as string) ?? "Untitled Backtest";

  const res = await fetch(`${base.replace(/\/$/, "")}/v1/backtest`, {
    method: "POST",
    headers: {
      "x-user-email": session.user.email,
      "x-backtest-name": name,
      "x-backtest-market-type": marketType,
    },
    body: formData,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

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

  const res = await fetch(`${base.replace(/\/$/, "")}/v1/backtest`, {
    headers: { "x-user-email": session.user.email },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
