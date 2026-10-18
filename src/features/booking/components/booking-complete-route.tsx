"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PageFooter, SiteHeader } from "@/components/vishu-ui";
import { CustomerAuthGuard } from "@/features/auth/components/customer-auth-guard";
import { bookingCompleteHref } from "@/features/booking/booking-navigation";
import { BookingComplete } from "./booking-complete";

export function BookingCompleteRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId")?.trim() ?? "";

  useEffect(() => {
    if (!reservationId) router.replace("/booking");
  }, [reservationId, router]);

  if (!reservationId) return null;

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
