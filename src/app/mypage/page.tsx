import type { Metadata } from "next";
import { CustomerAccountOverview } from "@/features/account/components/customer-account";

export const metadata: Metadata = {
  title: "マイページ",
  robots: { index: false, follow: false },
};

export default function MyPage() {
  return <CustomerAccountOverview />;
}
