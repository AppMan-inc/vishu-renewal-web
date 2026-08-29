import type { ReactNode } from "react";
import { AdminConsoleProvider } from "@/features/admin/components/admin-console";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminConsoleProvider>{children}</AdminConsoleProvider>;
}
