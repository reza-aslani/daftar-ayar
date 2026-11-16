import { NextResponse } from "next/server";
import { getSession } from "@/server/auth";
import { findDocumentsByQuery, listSearchPeople } from "@/server/search";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const headers = { "Cache-Control": "private, no-store" };
  if (!query.trim()) {
    const people = await listSearchPeople();
    return NextResponse.json({ people }, { headers });
  }
  const documents = await findDocumentsByQuery(query);
  return NextResponse.json({ documents }, { headers });
}
