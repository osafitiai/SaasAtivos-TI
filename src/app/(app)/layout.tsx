import { requireSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();

  const unread = await queryOne<{ count: string }>(
    "select count(*)::int as count from notifications where user_id = $1 and read_at is null",
    [user.id]
  );

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar user={user} unreadCount={Number(unread?.count ?? 0)} />
        <main className="mx-auto max-w-[1600px] p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
