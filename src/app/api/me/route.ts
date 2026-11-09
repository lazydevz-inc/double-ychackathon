import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HANDLE } from "@/lib/store";

/** /api/me?as=handle — view the app as that person's Double (demo + returning users). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const as = (url.searchParams.get("as") ?? "").toLowerCase();
  const jar = await cookies();
  if (HANDLE.test(as)) jar.set("me", as, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  else jar.delete("me");
  redirect(url.searchParams.get("to") ?? "/feed");
}
