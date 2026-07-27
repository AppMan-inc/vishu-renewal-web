import type { Metadata } from "next";
import { CustomerProfileEditor } from "@/features/account/components/customer-account";

export const metadata: Metadata = {
  title: "プロフィール編集",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <CustomerProfileEditor />;
}
