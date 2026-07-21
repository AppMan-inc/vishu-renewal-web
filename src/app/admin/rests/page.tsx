import type { Metadata } from "next";
import { AdminConsole } from "@/features/admin/components/admin-console";

export const metadata: Metadata = { title: "休憩登録", robots: { index: false, follow: false } };
export default function Page() { return <AdminConsole section="rests" />; }
