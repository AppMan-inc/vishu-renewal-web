import type { Metadata } from "next";
import { Suspense } from "react";
import { PageFooter, SiteHeader } from "@/components/vishu-ui";
import { BookingFlowClient } from "@/features/booking/components/booking-flow-client";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Web予約",
  description: "メニューと日時を選んでSalon Vishuを予約します。",
  path: "/booking",
});

export default function BookingPage() {
  return (
    <main className="app-page booking-page">
      <SiteHeader />
      <Suspense fallback={<BookingPageFallback />}>
        <BookingFlowClient />
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
