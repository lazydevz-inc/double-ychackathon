import { cookies } from "next/headers";
import { HANDLE } from "./store";

export async function getMe() {
  const v = (await cookies()).get("me")?.value;
  return v && HANDLE.test(v) ? v : undefined;
}
