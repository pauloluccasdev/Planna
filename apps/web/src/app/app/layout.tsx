import { redirect } from "next/navigation";
import { authenticatedApi } from "../_lib/api";
import { AppNavigation } from "./_components/app-navigation";

type Course = { _count?: { subjects?: number } };
type Content = { estimatedDurationSeconds?: number | null };
type Interval = { id: string };

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [meResponse, coursesResponse, contentsResponse, availabilityResponse] =
    await Promise.all([
      authenticatedApi("me"),
      authenticatedApi("courses"),
      authenticatedApi("contents?status=ACTIVE"),
      authenticatedApi("availability"),
    ]);

  if (!meResponse || meResponse.status === 401) redirect("/login");

  const user = meResponse.ok
    ? ((await meResponse.json()) as { data: { id: string; role: string } }).data
    : { id: "unknown", role: "STUDENT" };
  const courses = coursesResponse?.ok
    ? ((await coursesResponse.json()) as { data: Course[] }).data
    : [];
  const contents = contentsResponse?.ok
    ? ((await contentsResponse.json()) as { data: Content[] }).data
    : [];
  const availability = availabilityResponse?.ok
    ? ((await availabilityResponse.json()) as { data: Interval[] }).data
    : [];

  const subjectCount = courses.reduce(
    (total, course) => total + (course._count?.subjects ?? 0),
    0,
  );
  const estimatedContentCount = contents.filter(
    (content) => (content.estimatedDurationSeconds ?? 0) > 0,
  ).length;

  return (
    <div className="authenticated-app">
      <AppNavigation
        isAdmin={user.role === "ADMIN"}
        userId={user.id}
        setup={{
          hasCourse: courses.length > 0,
          hasSubject: subjectCount > 0,
          hasContent: contents.length > 0,
          hasEstimate: estimatedContentCount > 0,
          hasAvailability: availability.length > 0,
        }}
      />
      {children}
    </div>
  );
}
