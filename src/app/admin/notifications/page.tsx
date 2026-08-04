import type { Metadata } from "next";
import { AdminConsole } from "@/features/admin/components/admin-console";

export const metadata: Metadata = {
  title: "お知らせ配信",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminConsole section="notifications" />;
}
