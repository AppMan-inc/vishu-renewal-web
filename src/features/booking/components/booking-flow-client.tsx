"use client";

import dynamic from "next/dynamic";

const BookingFlow = dynamic(
  () => import("./booking-flow").then((module) => module.BookingFlow),
  {
    ssr: false,
    loading: () => (
      <section className="app-page-shell" aria-busy="true">
        <p>メニューを読み込んでいます…</p>
      </section>
    ),
  },
);

export function BookingFlowClient() {
  return <BookingFlow />;
}
