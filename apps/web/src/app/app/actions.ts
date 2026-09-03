"use server";

import { redirect } from "next/navigation";
import { clearSession } from "../_lib/api";

export async function logout() {
  await clearSession();
  redirect("/login");
}
