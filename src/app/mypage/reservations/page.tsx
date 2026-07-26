import type { Metadata } from "next";
import { CustomerReservationHistory } from "@/features/account/components/customer-account";

export const metadata: Metadata = {
  title: "予約履歴",
  robots: { index: false, follow: false },
};

export default function ReservationsPage() {
  return <CustomerReservationHistory />;
}
