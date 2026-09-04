import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageFooter, SiteHeader } from "@/components/vishu-ui";
import { BookingComplete } from "@/features/booking/components/booking-complete";
import { bookingCompleteHref } from "@/features/booking/booking-navigation";
import { CustomerAuthGuard } from "@/features/auth/components/customer-auth-guard";

export const metadata: Metadata = {
  title: "予約完了",
  robots: { index: false, follow: false },
};

type BookingCompletePageProps = {
  searchParams: Promise<{ reservationId?: string | string[] }>;
};

export default async function BookingCompletePage({
  searchParams,
}: BookingCompletePageProps) {
  const reservationIdValue = (await searchParams).reservationId;
  const reservationId = (
    Array.isArray(reservationIdValue) ? reservationIdValue[0] : reservationIdValue
  )?.trim();

  if (!reservationId) redirect("/booking");

  return (
    <CustomerAuthGuard returnTo={bookingCompleteHref(reservationId)}>
      <main className="app-page booking-page">
        <SiteHeader />
        <BookingComplete reservationId={reservationId} />
        <PageFooter />
      </main>
    </CustomerAuthGuard>
  );
}
