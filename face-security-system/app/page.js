import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/session";

export default function Home() {
  const session = getSessionFromCookies();
  redirect(session ? "/dashboard" : "/login");
}
