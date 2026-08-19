import type { Metadata } from "next";
import { Suspense } from "react";
import { PageFooter, SiteHeader } from "@/components/vishu-ui";
import { BookingFlow } from "@/features/booking/components/booking-flow";

export const metadata: Metadata = {
  title: "Web予約",
  description: "メニューと日時を選んでSalon Vishuを予約します。",
};

export default function BookingPage() {
  return (
    <main className="app-page booking-page">
      <SiteHeader />
      <Suspense fallback={<BookingPageFallback />}>
        <BookingFlow />
      </Suspense>
      <PageFooter />
    </main>
  );
}

function BookingPageFallback() {
  return (
    <section className="app-page-shell" aria-busy="true">
      <p>メニューを読み込んでいます…</p>
    </section>
  );
}
