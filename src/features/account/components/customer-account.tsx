"use client";

import { updateProfile } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { VishuIcon } from "@/components/vishu-ui";
import {
  CustomerAccountSnapshot,
  CustomerProfile,
  CustomerReservation,
  loadCustomerAccount,
  loadCustomerProfile,
  saveCustomerProfile,
} from "@/features/account/account-data";
import {
  bookingCancellationErrorMessage,
  cancelBookingReservation,
} from "@/features/booking/reservation-api";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  FORM_FIELD_LIMITS,
  personNameValidationMessage,
  phoneFieldChangeResult,
  requiredPhoneValidationMessage,
  sanitizePhoneNumber,
} from "@/features/form-validation";

const accountNavigation = [
  { href: "/mypage", label: "マイページ" },
  { href: "/mypage/reservations", label: "予約履歴" },
  { href: "/mypage/profile", label: "プロフィール" },
];

export function CustomerAccountNavigation() {
  const pathname = usePathname();

  return (
    <nav className="account-navigation" aria-label="マイページメニュー">
      {accountNavigation.map((item) => (
        <Link
          aria-current={pathname === item.href ? "page" : undefined}
          className={pathname === item.href ? "is-current" : ""}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function CustomerAccountOverview() {
  const { snapshot, isLoading, errorMessage, reload } = useAccountSnapshot();

  if (isLoading) return <AccountLoading label="マイページを読み込んでいます…" />;
  if (!snapshot) return <AccountError message={errorMessage} onRetry={reload} />;

  const { profile, reservations } = snapshot;
  const upcoming = reservations.filter(isUpcomingReservation);
  const nextReservation = [...upcoming].sort(
    (left, right) => left.startAt.getTime() - right.startAt.getTime(),
  )[0];
  const displayName = profileDisplayName(profile) || "お客様";
  const completedFields = [
    profile.lastName,
    profile.firstName,
    profile.telephoneNumber,
    profile.dateOfBirth,
  ].filter(Boolean).length;

  return (
    <div className="account-content">
      <AccountPageHeading
        eyebrow="MY PAGE"
        title={`${displayName}さま`}
        description="ご予約の確認と、お客様情報の変更ができます。"
      />

      <section className="account-overview-grid" aria-label="アカウント概要">
        <article className="account-hero-card">
          <div className="account-card-icon"><VishuIcon name="calendar" /></div>
          <p className="module-label">NEXT RESERVATION</p>
          <h2>{nextReservation ? "次回のご予約" : "新しいご予約"}</h2>
          {nextReservation ? (
            <>
              <strong className="account-next-date">{formatReservationDate(nextReservation.startAt)}</strong>
              <p>{nextReservation.menuName}</p>
              <div className="account-card-actions">
                <Link className="button button-primary" href="/mypage/reservations">
                  予約内容を見る<VishuIcon name="arrow" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <p>現在、これからのご予約はありません。</p>
              <div className="account-card-actions">
                <Link className="button button-primary" href="/booking">
                  Web予約へ<VishuIcon name="arrow" />
                </Link>
              </div>
            </>
          )}
        </article>

        <article className="account-profile-card">
          <div className="account-card-icon"><VishuIcon name="person" /></div>
          <p className="module-label">PROFILE</p>
          <h2>プロフィール</h2>
          <dl>
            <div><dt>お名前</dt><dd>{displayName}</dd></div>
            <div><dt>電話番号</dt><dd>{profile.telephoneNumber || "未登録"}</dd></div>
            <div><dt>登録状況</dt><dd>{completedFields === 4 ? "登録済み" : `${completedFields}/4 項目`}</dd></div>
          </dl>
          <Link className="account-text-link" href="/mypage/profile">
            お客様情報を編集<VishuIcon name="arrow" />
          </Link>
        </article>
      </section>

      <section className="account-shortcuts" aria-labelledby="account-shortcuts-title">
        <div>
          <p className="module-label">QUICK ACCESS</p>
          <h2 id="account-shortcuts-title">アカウントメニュー</h2>
        </div>
        <div className="account-shortcut-grid">
          <AccountShortcut
            href="/mypage/reservations"
            icon="clock"
            title="予約履歴"
            description={`${upcoming.length}件の今後のご予約`}
          />
          <AccountShortcut
            href="/mypage/profile"
            icon="person"
            title="プロフィール編集"
            description="予約に使うお客様情報を変更"
          />
          <AccountShortcut
            href="/booking"
            icon="calendar"
            title="Web予約"
            description="メニューと日時を選んで予約"
          />
        </div>
      </section>
    </div>
  );
}

export function CustomerReservationHistory() {
  const { snapshot, isLoading, errorMessage, reload } = useAccountSnapshot();
  const [reservationToCancel, setReservationToCancel] =
    useState<CustomerReservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState("");
  const [cancellationMessage, setCancellationMessage] = useState("");

  useEffect(() => {
    if (!reservationToCancel || isCancelling) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setReservationToCancel(null);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isCancelling, reservationToCancel]);

  async function confirmCancellation() {
    if (!reservationToCancel || isCancelling) return;
    setIsCancelling(true);
    setCancellationError("");
    setCancellationMessage("");
    try {
      await cancelBookingReservation(reservationToCancel.id);
      setCancellationMessage("予約をキャンセルしました。予約履歴へ反映されています。");
      setReservationToCancel(null);
      reload();
    } catch (error) {
      setCancellationError(bookingCancellationErrorMessage(error));
    } finally {
      setIsCancelling(false);
    }
  }

  if (isLoading) return <AccountLoading label="予約履歴を読み込んでいます…" />;
  if (!snapshot) return <AccountError message={errorMessage} onRetry={reload} />;

  const upcoming = snapshot.reservations
    .filter(isUpcomingReservation)
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  const history = snapshot.reservations.filter(
    (reservation) => !isUpcomingReservation(reservation),
  );

  return (
    <div className="account-content">
      <AccountPageHeading
        eyebrow="RESERVATIONS"
        title="予約履歴"
        description="これからのご予約と、過去のご来店内容を確認できます。"
        action={<Link className="button button-primary" href="/booking">新しく予約する<VishuIcon name="arrow" /></Link>}
      />

      {cancellationMessage ? (
        <div className="account-action-message is-success" role="status">
          <VishuIcon name="leaf" />
          <span>{cancellationMessage}</span>
        </div>
      ) : null}

      {snapshot.reservations.length === 0 ? (
        <section className="account-empty-state">
          <div className="account-card-icon"><VishuIcon name="calendar" /></div>
          <h2>予約履歴はまだありません</h2>
          <p>メニューと日時を選んで、Webからご予約いただけます。</p>
          <Link className="button button-primary" href="/booking">Web予約へ<VishuIcon name="arrow" /></Link>
        </section>
      ) : (
        <div className="reservation-history-sections">
          <ReservationSection
            eyebrow="UPCOMING"
            title="これからのご予約"
            reservations={upcoming}
            onCancel={(reservation) => {
              setCancellationError("");
              setReservationToCancel(reservation);
            }}
          />
          <ReservationSection eyebrow="HISTORY" title="過去のご予約" reservations={history} />
        </div>
      )}

      <aside className="account-contact-note">
        <VishuIcon name="phone" />
        <div><strong>予約内容の変更・お急ぎのご相談</strong><p>内容変更や開始時刻を過ぎた予約については、お電話でお問い合わせください。</p></div>
        <a href="tel:0721218824">0721-21-8824</a>
      </aside>

      {reservationToCancel ? (
        <div
          className="reservation-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCancelling) {
              setReservationToCancel(null);
            }
          }}
        >
          <section
            aria-describedby="cancel-reservation-description"
            aria-labelledby="cancel-reservation-title"
            aria-modal="true"
            className="reservation-cancel-dialog"
            role="alertdialog"
          >
            <div className="account-card-icon"><VishuIcon name="calendar" /></div>
            <p className="module-label">CANCEL RESERVATION</p>
            <h2 id="cancel-reservation-title">この予約をキャンセルしますか？</h2>
            <div className="reservation-cancel-summary">
              <strong>{reservationToCancel.menuName}</strong>
              <span>{formatReservationDate(reservationToCancel.startAt)}</span>
            </div>
            <p id="cancel-reservation-description">
              キャンセル後は元に戻せません。予約履歴にはキャンセル済みとして残ります。
            </p>
            {cancellationError ? (
              <div className="account-form-message is-error" role="alert">
                {cancellationError}
              </div>
            ) : null}
            <div className="reservation-dialog-actions">
              <button
                autoFocus
                className="button button-quiet"
                disabled={isCancelling}
                type="button"
                onClick={() => setReservationToCancel(null)}
              >
                戻る
              </button>
              <button
                className="button reservation-cancel-confirm"
                disabled={isCancelling}
                type="button"
                onClick={() => void confirmCancellation()}
              >
                {isCancelling ? "キャンセル処理中…" : "予約をキャンセルする"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function CustomerProfileEditor() {
  const currentUser = firebaseAuth().currentUser;
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"lastName" | "firstName" | "telephoneNumber", string>>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const dateOfBirthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    let isActive = true;
    loadCustomerProfile(
      currentUser.uid,
      currentUser.email ?? "",
      currentUser.displayName ?? "",
    )
      .then((result) => {
        if (isActive) {
          setProfile({
            ...result,
            telephoneNumber: sanitizePhoneNumber(result.telephoneNumber),
          });
        }
      })
      .catch(() => {
        if (isActive) {
          setProfile(null);
          setErrorMessage("プロフィールを読み込めませんでした。時間をおいて再度お試しください。");
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => { isActive = false; };
  }, [currentUser, reloadKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !profile || isSaving) return;

    const errors = {
      lastName: personNameValidationMessage(profile.lastName, "姓") ?? undefined,
      firstName: personNameValidationMessage(profile.firstName, "名") ?? undefined,
      telephoneNumber: requiredPhoneValidationMessage(profile.telephoneNumber) ?? undefined,
    };
    setFieldErrors(errors);
    const firstInvalid = errors.lastName
      ? lastNameRef
      : errors.firstName
        ? firstNameRef
        : errors.telephoneNumber
          ? phoneRef
          : null;
    if (firstInvalid) {
      requestAnimationFrame(() => {
        firstInvalid.current?.focus();
        firstInvalid.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    if (!profile.dateOfBirth) {
      setErrorMessage("生年月日を入力してください。");
      requestAnimationFrame(() => dateOfBirthRef.current?.focus());
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await saveCustomerProfile(currentUser.uid, profile);
      await updateProfile(currentUser, { displayName: profileDisplayName(profile) });
      setSuccessMessage("プロフィールを更新しました。");
    } catch {
      setErrorMessage("プロフィールを更新できませんでした。時間をおいて再度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <AccountLoading label="プロフィールを読み込んでいます…" />;
  if (!profile) {
    return (
      <AccountError
        message={errorMessage}
        onRetry={() => {
          setIsLoading(true);
          setErrorMessage("");
          setReloadKey((key) => key + 1);
        }}
      />
    );
  }

  return (
    <div className="account-content account-profile-content">
      <AccountPageHeading
        eyebrow="PROFILE"
        title="プロフィール編集"
        description="Web予約とアプリで使用するお客様情報を変更できます。"
      />

      <form className="account-profile-form" onSubmit={handleSubmit} noValidate>
        <section>
          <div className="account-form-heading">
            <div className="account-card-icon"><VishuIcon name="person" /></div>
            <div><h2>お客様情報</h2><p>入力した内容は、次回の予約時に自動で反映されます。</p></div>
          </div>

          {errorMessage ? <div className="account-form-message is-error" role="alert">{errorMessage}</div> : null}
          {successMessage ? <div className="account-form-message is-success" role="status">{successMessage}</div> : null}

          <div className="account-form-grid">
            <label className="is-wide"><span>メールアドレス</span><input disabled value={profile.email} /></label>
            <label><span>姓 <em>必須</em></span><input ref={lastNameRef} autoComplete="family-name" required value={profile.lastName} aria-invalid={Boolean(fieldErrors.lastName)} aria-describedby={fieldErrors.lastName ? "profile-last-name-error" : undefined} onBlur={() => setFieldErrors((current) => ({ ...current, lastName: personNameValidationMessage(profile.lastName, "姓") ?? undefined }))} onChange={(event) => { const value = event.target.value; setProfile({ ...profile, lastName: value }); setFieldErrors((current) => value.length > FORM_FIELD_LIMITS.personName || current.lastName ? { ...current, lastName: personNameValidationMessage(value, "姓") ?? undefined } : current); }} />{fieldErrors.lastName ? <small className="field-error" id="profile-last-name-error" aria-live="polite">{fieldErrors.lastName}</small> : null}</label>
            <label><span>名 <em>必須</em></span><input ref={firstNameRef} autoComplete="given-name" required value={profile.firstName} aria-invalid={Boolean(fieldErrors.firstName)} aria-describedby={fieldErrors.firstName ? "profile-first-name-error" : undefined} onBlur={() => setFieldErrors((current) => ({ ...current, firstName: personNameValidationMessage(profile.firstName, "名") ?? undefined }))} onChange={(event) => { const value = event.target.value; setProfile({ ...profile, firstName: value }); setFieldErrors((current) => value.length > FORM_FIELD_LIMITS.personName || current.firstName ? { ...current, firstName: personNameValidationMessage(value, "名") ?? undefined } : current); }} />{fieldErrors.firstName ? <small className="field-error" id="profile-first-name-error" aria-live="polite">{fieldErrors.firstName}</small> : null}</label>
            <label className="is-wide"><span>電話番号 <em>必須</em></span><input ref={phoneRef} autoComplete="tel" inputMode="numeric" pattern="[0-9]*" placeholder="09012345678" required type="tel" value={profile.telephoneNumber} aria-invalid={Boolean(fieldErrors.telephoneNumber)} aria-describedby={fieldErrors.telephoneNumber ? "profile-phone-error" : undefined} onBlur={() => setFieldErrors((current) => ({ ...current, telephoneNumber: requiredPhoneValidationMessage(profile.telephoneNumber) ?? undefined }))} onChange={(event) => { const rawValue = event.target.value; setProfile({ ...profile, telephoneNumber: sanitizePhoneNumber(rawValue) }); setFieldErrors((current) => ({ ...current, telephoneNumber: phoneFieldChangeResult(rawValue, current.telephoneNumber).error ?? undefined })); }} />{fieldErrors.telephoneNumber ? <small className="field-error" id="profile-phone-error" aria-live="polite">{fieldErrors.telephoneNumber}</small> : null}</label>
            <label><span>生年月日 <em>必須</em></span><input ref={dateOfBirthRef} max={todayDateString()} min="1920-01-01" required type="date" value={profile.dateOfBirth} onChange={(event) => setProfile({ ...profile, dateOfBirth: event.target.value })} /></label>
            <fieldset>
              <legend>性別</legend>
              <div className="account-gender-options">
                {(["男性", "女性", "その他"] as const).map((gender) => (
                  <label key={gender}><input checked={profile.gender === gender} name="gender" type="radio" value={gender} onChange={() => setProfile({ ...profile, gender })} /><span>{gender}</span></label>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <div className="account-profile-actions">
          <Link className="button button-quiet" href="/mypage">キャンセル</Link>
          <button className="button button-primary" disabled={isSaving} type="submit">
            {isSaving ? "保存しています…" : "変更を保存"}
            {!isSaving ? <VishuIcon name="arrow" /> : null}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccountPageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="account-page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {action}
    </header>
  );
}

function AccountShortcut({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: "calendar" | "clock" | "person";
  title: string;
  description: string;
}) {
  return (
    <Link className="account-shortcut-card" href={href}>
      <span className="account-card-icon"><VishuIcon name={icon} /></span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <VishuIcon name="arrow" />
    </Link>
  );
}

function ReservationSection({
  eyebrow,
  title,
  reservations,
  onCancel,
}: {
  eyebrow: string;
  title: string;
  reservations: CustomerReservation[];
  onCancel?: (reservation: CustomerReservation) => void;
}) {
  return (
    <section className="reservation-history-section">
      <div className="account-section-heading"><p className="module-label">{eyebrow}</p><h2>{title}</h2></div>
      {reservations.length === 0 ? (
        <p className="reservation-section-empty">該当するご予約はありません。</p>
      ) : (
        <div className="reservation-card-list">
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: CustomerReservation;
  onCancel?: (reservation: CustomerReservation) => void;
}) {
  return (
    <article className="customer-reservation-card">
      <div className="reservation-date-block">
        <small>{reservation.startAt.getFullYear()}</small>
        <strong>{reservation.startAt.getMonth() + 1}/{reservation.startAt.getDate()}</strong>
        <span>{weekdayLabel(reservation.startAt)}</span>
      </div>
      <div className="reservation-card-body">
        <div className="reservation-card-title">
          <span className={`reservation-status is-${reservation.status}`}>{statusLabel(reservation.status)}</span>
          <small>予約番号 {reservation.id}</small>
        </div>
        <h3>{reservation.menuName}</h3>
        <div className="reservation-meta">
          <span><VishuIcon name="clock" />{timeLabel(reservation.startAt)}{reservation.durationMinutes > 0 ? ` · ${reservation.durationMinutes}分` : ""}</span>
          {reservation.price !== null ? <span>¥{reservation.price.toLocaleString("ja-JP")}</span> : null}
        </div>
        {reservation.request ? <p className="reservation-request">ご要望：{reservation.request}</p> : null}
        {onCancel ? (
          <div className="reservation-card-actions">
            <button
              className="reservation-cancel-button"
              type="button"
              onClick={() => onCancel(reservation)}
            >
              この予約をキャンセル
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AccountLoading({ label }: { label: string }) {
  return <div className="account-state-card" aria-busy="true"><span className="booking-spinner" /><p>{label}</p></div>;
}

function AccountError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="account-state-card" role="alert">
      <div className="account-card-icon"><VishuIcon name="leaf" /></div>
      <h2>情報を読み込めませんでした</h2>
      <p>{message || "通信状況をご確認のうえ、もう一度お試しください。"}</p>
      <button className="button button-quiet" type="button" onClick={onRetry}>再読み込み</button>
    </div>
  );
}

function useAccountSnapshot() {
  const currentUser = firebaseAuth().currentUser;
  const [snapshot, setSnapshot] = useState<CustomerAccountSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    let isActive = true;
    loadCustomerAccount(
      currentUser.uid,
      currentUser.email ?? "",
      currentUser.displayName ?? "",
    )
      .then((result) => {
        if (isActive) setSnapshot(result);
      })
      .catch(() => {
        if (isActive) {
          setSnapshot(null);
          setErrorMessage("通信状況をご確認のうえ、もう一度お試しください。");
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => { isActive = false; };
  }, [currentUser, reloadKey]);

  return useMemo(() => ({
    snapshot,
    isLoading,
    errorMessage,
    reload: () => {
      setIsLoading(true);
      setErrorMessage("");
      setReloadKey((key) => key + 1);
    },
  }), [errorMessage, isLoading, snapshot]);
}

function isUpcomingReservation(reservation: CustomerReservation) {
  return (
    reservation.startAt.getTime() >= Date.now() &&
    reservation.status !== "cancelled" &&
    reservation.status !== "completed"
  );
}

function profileDisplayName(profile: CustomerProfile) {
  return [profile.lastName, profile.firstName].filter(Boolean).join(" ").trim();
}

function formatReservationDate(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdayLabel(date)}） ${timeLabel(date)}`;
}

function timeLabel(date: Date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function weekdayLabel(date: Date) {
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

function statusLabel(status: CustomerReservation["status"]) {
  return { pending: "確認中", confirmed: "予約確定", completed: "来店済み", cancelled: "キャンセル" }[status];
}

function todayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}
