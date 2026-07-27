import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminMenusConsole } from "@/features/admin/components/admin-console";

export const metadata: Metadata = { title: "メニュー管理", robots: { index: false, follow: false } };
export default function Page() { return <Suspense><AdminMenusConsole /></Suspense>; }
