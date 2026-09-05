"use server";

import { redirect } from "next/navigation";
import { authenticatedApi, clearSession } from "../_lib/api";

export async function logout() {
  try {
    await authenticatedApi("auth/logout", { method: "POST" });
  } finally {
    await clearSession();
  }
  redirect("/login");
}
