import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingCompleteRoute } from "@/features/booking/components/booking-complete-route";

export const metadata: Metadata = {
  title: "予約完了",
  robots: { index: false, follow: false },
};

export default function BookingCompletePage() {
  return (
    <Suspense fallback={
      <main className="auth-loading-page" aria-busy="true">
        <p>予約情報を確認しています…</p>
      </main>
    }>
      <BookingCompleteRoute />
    </Suspense>
  );
}
