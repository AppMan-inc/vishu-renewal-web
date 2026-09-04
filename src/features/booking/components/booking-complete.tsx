"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VishuIcon } from "@/components/vishu-ui";
import {
  type CustomerReservation,
  loadCustomerAccount,
} from "@/features/account/account-data";
import { firebaseAuth } from "@/lib/firebase/client";
import styles from "./booking-complete.module.css";

type ReservationState =
  | { status: "loading" }
  | { status: "loaded"; reservation: CustomerReservation }
  | { status: "unavailable" };

export function BookingComplete({ reservationId }: { reservationId: string }) {
  const [state, setState] = useState<ReservationState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;
    const currentUser = firebaseAuth().currentUser;
    if (!currentUser) {
      queueMicrotask(() => {
        if (isActive) setState({ status: "unavailable" });
      });
      return () => {
        isActive = false;
      };
    }

    loadCustomerAccount(
      currentUser.uid,
      currentUser.email ?? "",
      currentUser.displayName ?? "",
    )
      .then(({ reservations }) => {
        if (!isActive) return;
        const reservation = reservations.find((item) => item.id === reservationId);
        setState(reservation
          ? { status: "loaded", reservation }
          : { status: "unavailable" });
      })
      .catch(() => {
        if (isActive) setState({ status: "unavailable" });
      });

    return () => {
      isActive = false;
    };
  }, [reservationId]);

  return (
    <section className={styles.shell} aria-labelledby="booking-complete-title">
      <div className={styles.card}>
        <div className={styles.mark} aria-hidden="true">
          <VishuIcon name="sparkle" />
        </div>
        <p className={styles.eyebrow}>RESERVATION COMPLETE</p>
        <h1 id="booking-complete-title">ご予約が完了しました</h1>
        <p className={styles.lead}>
          ご予約ありがとうございます。<br />当日のご来店を心よりお待ちしております。
        </p>

        {state.status === "loading" ? (
          <div className={styles.loading} aria-busy="true">
            <span className="booking-spinner" />
            <p>予約内容を確認しています…</p>
          </div>
        ) : null}

        {state.status === "loaded" ? (
          <ReservationDetails reservation={state.reservation} />
        ) : null}

        {state.status === "unavailable" ? (
          <div className={styles.fallback}>
            <p>予約内容は予約履歴からご確認いただけます。</p>
            <span>予約番号：{reservationId}</span>
          </div>
        ) : null}

        <div className={styles.actions}>
          <Link className="button button-primary" href="/mypage/reservations">
            予約履歴を確認する<VishuIcon name="arrow" />
          </Link>
          <Link className={styles.homeLink} href="/">
            トップページへ戻る
          </Link>
        </div>

        <p className={styles.note}>
          予約内容の確認・キャンセルは、予約履歴からお手続きいただけます。
        </p>
      </div>
    </section>
  );
}

function ReservationDetails({ reservation }: { reservation: CustomerReservation }) {
  return (
    <dl className={styles.details}>
      <div>
        <dt>ご予約日時</dt>
        <dd>{formatReservationDate(reservation.startAt)}</dd>
      </div>
      <div>
        <dt>メニュー</dt>
        <dd>{reservation.menuName}</dd>
      </div>
      {reservation.durationMinutes > 0 ? (
        <div>
          <dt>所要時間</dt>
          <dd>{reservation.durationMinutes}分</dd>
        </div>
      ) : null}
      {reservation.price !== null ? (
        <div>
          <dt>料金</dt>
          <dd>¥{reservation.price.toLocaleString("ja-JP")}</dd>
        </div>
      ) : null}
      <div>
        <dt>予約番号</dt>
        <dd className={styles.reservationId}>{reservation.id}</dd>
      </div>
    </dl>
  );
}

function formatReservationDate(date: Date) {
  const day = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
  const time = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${day} ${time}`;
}
