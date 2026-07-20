import type { Metadata } from "next";
import { PageFooter, SiteHeader } from "@/components/vishu-ui";
import { CustomerAuthGuard } from "@/features/auth/components/customer-auth-guard";
import { BookingFlow } from "@/features/booking/components/booking-flow";

export const metadata: Metadata = {
  title: "Web予約",
  description: "メニューと日時を選んでSalon Vishuを予約します。",
};

export default function BookingPage() {
  return (
    <CustomerAuthGuard returnTo="/booking">
      <main className="app-page booking-page">
        <SiteHeader />
        <BookingFlow />
        <PageFooter />
      </main>
    </CustomerAuthGuard>
  );
}
