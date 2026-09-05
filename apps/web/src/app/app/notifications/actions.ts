"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";

export async function markNotificationRead(id: string) {
  const response = await authenticatedApi(`notifications/${id}/read`, {
    method: "POST",
  });
  if (!response || response.status === 401) redirect("/login");
  if (response.ok) revalidatePath("/app/notifications");
}
