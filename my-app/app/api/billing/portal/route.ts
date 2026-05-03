import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
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

  const res = await fetch(`${base.replace(/\/$/, "")}/v1/billing/portal`, {
    method: "POST",
    headers: { "x-user-email": session.user.email },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
