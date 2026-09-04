"use client";

import Image from "next/image";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { VishuIcon } from "@/components/vishu-ui";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  BookingCatalog,
  BookingMenu,
  loadBookingAvailability,
  loadBookingCustomerProfile,
  loadBookingMenus,
} from "@/features/booking/booking-data";
import { bookingSlotsForDate } from "@/features/booking/booking-availability";
import { createBookingAvailabilityStore } from "@/features/booking/booking-availability-prefetch";
import {
  categoryDisplayLabel,
  defaultSelectedCategoryIds,
  groupVisibleMenus,
  isCoupon,
  menuCategories,
  toggleCategory,
  type MenuGroups,
} from "@/features/booking/booking-menu-catalog";
import {
  bookingCompleteHref,
  bookingLoginHref,
} from "@/features/booking/booking-navigation";
import {
  bookingReservationErrorMessage,
  createBookingReservation,
} from "@/features/booking/reservation-api";
import {
  FORM_FIELD_LIMITS,
  personNameValidationMessage,
  phoneFieldChangeResult,
  requiredPhoneValidationMessage,
  sanitizePhoneNumber,
} from "@/features/form-validation";

const steps = ["メニュー", "日時", "お客様情報", "確認"];
const mobileBookingMediaQuery = "(max-width: 680px)";
type Step = 0 | 1 | 2 | 3;
type ReservationSubmission =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; reservationId: string }
  | { status: "error"; message: string };
type BookingFieldErrors = Partial<Record<"name" | "phone" | "request", string>>;

const bookingAvailabilityStore = createBookingAvailabilityStore(
  loadBookingAvailability,
);

export function BookingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMenuId = searchParams.get("menuId");
  const [currentUser, setCurrentUser] = useState<User | null>(initialCurrentUser);
  const [catalog, setCatalog] = useState<BookingCatalog | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    defaultSelectedCategoryIds,
  );
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>(
    defaultSelectedCategoryIds,
  );
  const [selectedMenu, setSelectedMenu] = useState<BookingMenu | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const dates = useMemo(() => nextDates(7, weekOffset * 7), [weekOffset]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [customerName, setCustomerName] = useState(currentUser?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [request, setRequest] = useState("");
  const [confirmedVisitNotice, setConfirmedVisitNotice] = useState(false);
  const [confirmedSalonNotice, setConfirmedSalonNotice] = useState(false);
  const [confirmedLongHairCharge, setConfirmedLongHairCharge] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [reservationSubmission, setReservationSubmission] =
    useState<ReservationSubmission>({ status: "idle" });
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<HTMLTextAreaElement>(null);
  const restoredMenuIdRef = useRef<string | null>(null);
  const previousStepRef = useRef<Step>(currentStep);
  const skipNextStepScrollRef = useRef(false);

  useEffect(() => {
    if (previousStepRef.current === currentStep) return;
    previousStepRef.current = currentStep;

    if (skipNextStepScrollRef.current) {
      skipNextStepScrollRef.current = false;
      return;
    }
    if (!window.matchMedia(mobileBookingMediaQuery).matches) return;

    const frameId = window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [currentStep]);

  useEffect(() => {
    try {
      return onAuthStateChanged(
        firebaseAuth(),
        setCurrentUser,
        () => setCurrentUser(null),
      );
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    loadBookingMenus()
      .then((loadedCatalog) => {
        if (!isActive) return;
        setCatalog(loadedCatalog);
        setLoadError(false);
      })
      .catch(() => {
        if (!isActive) return;
        setLoadError(true);
      });
    return () => {
      isActive = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (currentStep !== 1) return;

    let isActive = true;
    bookingAvailabilityStore.get(availabilityRange(dates))
      .then((availability) => {
        if (!isActive) return;
        setCatalog((current) => current ? { ...current, ...availability } : current);
      })
      .finally(() => {
        if (isActive) setIsAvailabilityLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [currentStep, dates]);

  useEffect(() => {
    if (!catalog || !currentUser || currentStep !== 0) return;

    return scheduleWhenIdle(() => {
      void bookingAvailabilityStore
        .prefetch(availabilityRange(dates))
        .catch(() => undefined);
    });
  }, [catalog, currentStep, currentUser, dates]);

  useEffect(() => {
    if (!currentUser) return;

    let isActive = true;
    loadBookingCustomerProfile(
      currentUser.uid,
      currentUser.displayName ?? "",
    ).then((profile) => {
      if (!isActive) return;
      setCustomerName((currentName) => currentName.trim() || profile.name);
      setPhone((currentPhone) => currentPhone.trim() || profile.phone);
    });

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  const visibleMenuGroups = useMemo(
    () => groupVisibleMenus(catalog?.menus ?? [], selectedCategoryIds),
    [catalog, selectedCategoryIds],
  );

  useEffect(() => {
    if (
      !currentUser ||
      !requestedMenuId ||
      !catalog ||
      restoredMenuIdRef.current === requestedMenuId
    ) {
      return;
    }

    const requestedMenu = catalog.menus.find(
      (menu) => menu.id === requestedMenuId,
    );
    if (!requestedMenu) return;

    let isActive = true;
    queueMicrotask(() => {
      if (!isActive) return;
      restoredMenuIdRef.current = requestedMenuId;
      setSelectedMenu(requestedMenu);
      setSelectedSlot(null);
      setConfirmedVisitNotice(false);
      setConfirmedSalonNotice(false);
      setConfirmedLongHairCharge(false);
      setReservationSubmission({ status: "idle" });
      if (!requestedMenu.isCallable) {
        void bookingAvailabilityStore
          .prefetch(availabilityRange(dates))
          .catch(() => undefined);
        setIsAvailabilityLoading(true);
        setCurrentStep(1);
      }
      router.replace("/booking", { scroll: false });
    });

    return () => {
      isActive = false;
    };
  }, [catalog, currentUser, dates, requestedMenuId, router]);

  useEffect(() => {
    if (currentUser || currentStep === 0 || !selectedMenu) return;
    router.replace(bookingLoginHref(selectedMenu.id));
  }, [currentStep, currentUser, router, selectedMenu]);

  function chooseMenu(menu: BookingMenu) {
    setSelectedMenu(menu);
    setSelectedSlot(null);
    setConfirmedVisitNotice(false);
    setConfirmedSalonNotice(false);
    setConfirmedLongHairCharge(false);
    setReservationSubmission({ status: "idle" });
    if (currentUser && !menu.isCallable) {
      void bookingAvailabilityStore
        .prefetch(availabilityRange(dates))
        .catch(() => undefined);
    }
    if (!currentUser) {
      router.push(bookingLoginHref(menu.id));
    }
  }

  function goForward() {
    if (currentStep === 0 && selectedMenu && !selectedMenu.isCallable) {
      setIsAvailabilityLoading(true);
      setCurrentStep(1);
      return;
    }
    if (currentStep === 1 && selectedSlot) {
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      const errors = bookingFieldErrors(customerName, phone, request);
      setFieldErrors(errors);
      const firstInvalid = errors.name
        ? nameRef
        : errors.phone
          ? phoneRef
          : errors.request
            ? requestRef
            : null;
      if (firstInvalid) {
        focusField(firstInvalid);
        return;
      }
      setCurrentStep(3);
    }
  }

  function goBack() {
    setReservationSubmission({ status: "idle" });
    setCurrentStep((step) => Math.max(0, step - 1) as Step);
  }

  async function confirmReservation() {
    if (
      !selectedMenu ||
      !selectedSlot ||
      !currentUser ||
      !confirmedVisitNotice ||
      !confirmedSalonNotice ||
      (selectedMenu.needsExtraMoney && !confirmedLongHairCharge) ||
      reservationSubmission.status === "submitting" ||
      reservationSubmission.status === "success"
    ) {
      return;
    }

    const errors = bookingFieldErrors(customerName, phone, request);
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      skipNextStepScrollRef.current = true;
      setCurrentStep(2);
      const firstInvalid = errors.name
        ? nameRef
        : errors.phone
          ? phoneRef
          : requestRef;
      focusField(firstInvalid);
      return;
    }

    setReservationSubmission({ status: "submitting" });
    try {
      const result = await createBookingReservation({
        menuId: selectedMenu.id,
        startAt: selectedSlot.toISOString(),
        customerName: customerName.trim(),
        telephoneNumber: phone.trim(),
        request: request.trim(),
      });
      setReservationSubmission({
        status: "success",
        reservationId: result.reservationId,
      });
      router.replace(bookingCompleteHref(result.reservationId));
    } catch (error) {
      setReservationSubmission({
        status: "error",
        message: bookingReservationErrorMessage(error),
      });
    }
  }

  const canContinue =
    (currentStep === 0 && Boolean(selectedMenu) && !selectedMenu?.isCallable) ||
    (currentStep === 1 && Boolean(selectedSlot)) ||
    currentStep === 2;
  const canConfirm =
    confirmedVisitNotice &&
    confirmedSalonNotice &&
    (!selectedMenu?.needsExtraMoney || confirmedLongHairCharge);

  return (
    <section className="app-page-shell">
      <div className="booking-title-row">
        <div>
          <p className="eyebrow">ONLINE BOOKING</p>
          <h1>Web予約</h1>
          <p>{stepDescription(currentStep)}</p>
        </div>
        <div className="booking-support">
          <VishuIcon name="clock" />
          <span><small>受付時間</small>24時間いつでも</span>
        </div>
      </div>

      <BookingProgress currentStep={currentStep} />

      <div className="booking-layout">
        <section className="booking-selection" aria-live="polite">
          {currentStep === 0 ? (
            <MenuStep
              catalog={catalog}
              hasError={loadError}
              menuGroups={visibleMenuGroups}
              draftCategoryIds={draftCategoryIds}
              selectedMenu={selectedMenu}
              onCategoryToggle={(categoryId) => setDraftCategoryIds(
                (current) => toggleCategory(current, categoryId),
              )}
              onCategoriesApply={() => setSelectedCategoryIds(draftCategoryIds)}
              onMenuSelect={chooseMenu}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          ) : null}
          {currentStep === 1 && catalog && selectedMenu ? (
            <DateTimeStep
              catalog={catalog}
              dates={dates}
              isAvailabilityLoading={isAvailabilityLoading}
              menu={selectedMenu}
              selectedSlot={selectedSlot}
              weekOffset={weekOffset}
              onWeekChange={(offset) => {
                setIsAvailabilityLoading(true);
                setCatalog((current) =>
                  current
                    ? {
                        ...current,
                        reservations: [],
                        restBlocks: [],
                        availabilityIsLive: false,
                      }
                    : current,
                );
                setWeekOffset(offset);
                setSelectedSlot(null);
                setReservationSubmission({ status: "idle" });
              }}
              onSlotSelect={(slot) => {
                setSelectedSlot(slot);
                setReservationSubmission({ status: "idle" });
              }}
            />
          ) : null}
          {currentStep === 2 ? (
            <CustomerStep
              email={currentUser?.email ?? ""}
              name={customerName}
              phone={phone}
              request={request}
              fieldErrors={fieldErrors}
              nameRef={nameRef}
              phoneRef={phoneRef}
              requestRef={requestRef}
              onNameBlur={() => setFieldErrors((current) => ({ ...current, name: personNameValidationMessage(customerName, "お名前") ?? undefined }))}
              onNameChange={(value) => { setCustomerName(value); setFieldErrors((current) => value.length > FORM_FIELD_LIMITS.personName || current.name ? { ...current, name: personNameValidationMessage(value, "お名前") ?? undefined } : current); }}
              onPhoneBlur={() => setFieldErrors((current) => ({ ...current, phone: requiredPhoneValidationMessage(phone) ?? undefined }))}
              onPhoneChange={(rawValue) => { setPhone(sanitizePhoneNumber(rawValue)); setFieldErrors((current) => ({ ...current, phone: phoneFieldChangeResult(rawValue, current.phone).error ?? undefined })); }}
              onRequestChange={(value) => { setRequest(value); setFieldErrors((current) => ({ ...current, request: value.length > FORM_FIELD_LIMITS.inquiryMessage ? "ご要望・ご相談は300文字以内で入力してください。" : undefined })); }}
            />
          ) : null}
          {currentStep === 3 && selectedMenu && selectedSlot ? (
            <ConfirmationStep
              email={currentUser?.email ?? ""}
              menu={selectedMenu}
              name={customerName}
              phone={phone}
              request={request}
              slot={selectedSlot}
              confirmedVisitNotice={confirmedVisitNotice}
              confirmedSalonNotice={confirmedSalonNotice}
              confirmedLongHairCharge={confirmedLongHairCharge}
              onVisitNoticeChange={setConfirmedVisitNotice}
              onSalonNoticeChange={setConfirmedSalonNotice}
              onLongHairChargeChange={setConfirmedLongHairCharge}
            />
          ) : null}

          <MobileBookingAction
            canContinue={canContinue}
            canConfirm={canConfirm}
            currentStep={currentStep}
            menu={selectedMenu}
            reservationSubmission={reservationSubmission}
            onConfirm={confirmReservation}
            onContinue={goForward}
          />

          {currentStep > 0 && reservationSubmission.status !== "success" ? (
            <button className="booking-inline-back" type="button" onClick={goBack}>
              <VishuIcon name="arrow" />
              前のステップへ戻る
            </button>
          ) : null}
        </section>

        <BookingSummary
          reservationSubmission={reservationSubmission}
          currentStep={currentStep}
          menu={selectedMenu}
          slot={selectedSlot}
          canContinue={canContinue}
          canConfirm={canConfirm}
          onContinue={goForward}
          onConfirm={confirmReservation}
        />
      </div>
    </section>
  );
}

function initialCurrentUser() {
  try {
    return firebaseAuth().currentUser;
  } catch {
    return null;
  }
}

function BookingProgress({ currentStep }: { currentStep: Step }) {
  return (
    <ol className="booking-progress" aria-label="予約の進行状況">
      {steps.map((step, index) => (
        <li
          aria-current={index === currentStep ? "step" : undefined}
          className={index === currentStep ? "is-current" : index < currentStep ? "is-complete" : ""}
          key={step}
        >
          <span className="booking-step-content">
            <span className="booking-step-number">{index + 1}</span>
            <strong>{step}</strong>
          </span>
          {index < steps.length - 1 ? (
            <span className="booking-step-connector" aria-hidden="true" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function MobileBookingAction({
  canContinue,
  canConfirm,
  currentStep,
  menu,
  reservationSubmission,
  onConfirm,
  onContinue,
}: {
  canContinue: boolean;
  canConfirm: boolean;
  currentStep: Step;
  menu: BookingMenu | null;
  reservationSubmission: ReservationSubmission;
  onConfirm: () => Promise<void>;
  onContinue: () => void;
}) {
  const isSubmitting = reservationSubmission.status === "submitting";
  const isSuccess = reservationSubmission.status === "success";

  return (
    <div className="booking-mobile-action">
      <div>
        <small>STEP {String(currentStep + 1).padStart(2, "0")}</small>
        <strong>{menu?.title ?? "メニューを選択"}</strong>
      </div>
      {currentStep < 3 ? (
        <button type="button" disabled={!canContinue} onClick={onContinue}>
          {continueLabel(currentStep, menu)}
          <VishuIcon name="arrow" />
        </button>
      ) : (
        <button
          type="button"
          disabled={!canConfirm || isSubmitting || isSuccess}
          onClick={() => void onConfirm()}
        >
          {isSubmitting ? "保存中…" : isSuccess ? "予約確定" : "予約を確定する"}
          {!isSubmitting && !isSuccess ? <VishuIcon name="arrow" /> : null}
        </button>
      )}
    </div>
  );
}

type MenuStepProps = {
  catalog: BookingCatalog | null;
  hasError: boolean;
  menuGroups: MenuGroups<BookingMenu>;
  draftCategoryIds: string[];
  selectedMenu: BookingMenu | null;
  onCategoryToggle: (category: string) => void;
  onCategoriesApply: () => void;
  onMenuSelect: (menu: BookingMenu) => void;
  onRetry: () => void;
};

function MenuStep(props: MenuStepProps) {
  return (
    <>
      <div className="subsection-heading">
        <span>STEP 01</span>
        <h2 id="booking-menu-heading">メニューを選ぶ</h2>
      </div>

      {props.catalog?.usesSampleMenus ? (
        <div className="booking-info-banner">
          <VishuIcon name="leaf" />
          <p><strong>サンプルメニューを表示中</strong>Firestoreのメニューが読み込めると自動で切り替わります。</p>
        </div>
      ) : null}

      <div className="booking-filter-panel">
        <div className="booking-filter-options" role="group" aria-label="メニューカテゴリ（複数選択可）">
          {menuCategories.map((category) => (
            <label key={category.id}>
              <input
                checked={props.draftCategoryIds.includes(category.id)}
                type="checkbox"
                onChange={() => props.onCategoryToggle(category.id)}
              />
              <span>{category.label}</span>
            </label>
          ))}
        </div>
        <div className="booking-filter-action">
          <button type="button" onClick={props.onCategoriesApply}>絞り込む</button>
        </div>
      </div>

      {!props.catalog && !props.hasError ? <BookingLoading /> : null}
      {props.hasError ? (
        <div className="booking-state-card">
          <VishuIcon name="leaf" />
          <h3>メニューを読み込めませんでした</h3>
          <button className="button button-quiet" type="button" onClick={props.onRetry}>もう一度試す</button>
        </div>
      ) : null}
      {props.catalog && props.menuGroups.coupons.length === 0 && props.menuGroups.regularMenus.length === 0 ? (
        <div className="booking-state-card"><p>該当するメニューがありません。</p></div>
      ) : null}

      {props.catalog ? (
        <>
          <MenuSection
            emptyMessage="該当するクーポンはありません。"
            menus={props.menuGroups.coupons}
            selectedMenu={props.selectedMenu}
            title="クーポン"
            onMenuSelect={props.onMenuSelect}
          />
          <MenuSection
            emptyMessage="該当する通常メニューはありません。"
            menus={props.menuGroups.regularMenus}
            selectedMenu={props.selectedMenu}
            title="通常メニュー"
            onMenuSelect={props.onMenuSelect}
          />
        </>
      ) : null}
    </>
  );
}

function MenuSection({
  emptyMessage,
  menus,
  selectedMenu,
  title,
  onMenuSelect,
}: {
  emptyMessage: string;
  menus: BookingMenu[];
  selectedMenu: BookingMenu | null;
  title: string;
  onMenuSelect: (menu: BookingMenu) => void;
}) {
  const headingId = `booking-${title === "クーポン" ? "coupon" : "regular"}-heading`;
  return (
    <section className="booking-menu-section" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}<span>{menus.length}件</span></h3>
      {menus.length === 0 ? <p className="booking-menu-empty">{emptyMessage}</p> : null}
      <div className="booking-menu-list">
        {menus.map((menu) => (
          <button
            aria-pressed={selectedMenu?.id === menu.id}
            className={`booking-menu-card${selectedMenu?.id === menu.id ? " is-selected" : ""}`}
            key={menu.id}
            type="button"
            onClick={() => onMenuSelect(menu)}
          >
            <MenuImage menu={menu} />
            <div className="booking-menu-copy">
              {menu.categories.length > 0 ? (
                <div className="booking-menu-treatments">
                  {menu.categories.map((category, index) => (
                    <span key={`${category}-${index}`}>{categoryDisplayLabel(category)}</span>
                  ))}
                </div>
              ) : null}
              <h3>{menu.title}</h3>
              <p className="booking-menu-description">{menu.description}</p>
              <MenuPrice menu={menu} />
            </div>
            <div className="booking-menu-meta">
              <span><VishuIcon name="clock" />{menu.durationMinutes}分</span>
              {menu.isCallable ? <small>要電話予約</small> : null}
              <span className="round-arrow"><VishuIcon name="arrow" /></span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function MenuPrice({ menu }: { menu: BookingMenu }) {
  return (
    <div className="booking-menu-price">
      {isCoupon(menu) && menu.beforePrice !== null ? (
        <del>¥{menu.beforePrice.toLocaleString("ja-JP")}</del>
      ) : null}
      <strong>{priceLabel(menu)}</strong>
    </div>
  );
}

function MenuImage({
  menu,
  compact = false,
}: {
  menu: BookingMenu;
  compact?: boolean;
}) {
  const [failedImageUrl, setFailedImageUrl] = useState("");

  if (!menu.imageUrl || failedImageUrl === menu.imageUrl) {
    return (
      <div className="booking-menu-icon">
        <VishuIcon name={menuIcon(menu)} />
      </div>
    );
  }

  return (
    <div className="booking-menu-icon has-image">
      <Image
        alt=""
        fill
        sizes={compact ? "(max-width: 680px) 46px, 58px" : "(max-width: 680px) 52px, (max-width: 767px) 58px, 76px"}
        src={menu.imageUrl}
        unoptimized
        onError={() => setFailedImageUrl(menu.imageUrl)}
      />
    </div>
  );
}

function DateTimeStep({
  catalog,
  dates,
  isAvailabilityLoading,
  menu,
  selectedSlot,
  weekOffset,
  onWeekChange,
  onSlotSelect,
}: {
  catalog: BookingCatalog;
  dates: Date[];
  isAvailabilityLoading: boolean;
  menu: BookingMenu;
  selectedSlot: Date | null;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onSlotSelect: (slot: Date) => void;
}) {
  const scheduleRows = useMemo(() => {
    const columns = dates.map((date) =>
      bookingSlotsForDate({
        date,
        durationMinutes: menu.durationMinutes,
        availability: catalog,
      }),
    );
    return (columns[0] ?? []).map((slot, rowIndex) => ({
      time: slot.start,
      slots: columns.map((column) => column[rowIndex]),
    }));
  }, [catalog, dates, menu]);

  return (
    <>
      <div className="subsection-heading">
        <span>STEP 02</span>
        <h2>ご希望の日時を選ぶ</h2>
      </div>
      <div className="selected-menu-panel">
        <MenuImage compact menu={menu} />
        <div><small>選択中のメニュー</small><strong>{menu.title}</strong><span>{menu.durationMinutes}分 · {priceLabel(menu)}</span></div>
      </div>
      {isAvailabilityLoading ? (
        <div className="booking-state-card is-loading">
          <span className="booking-spinner" />
          <p>空き状況を読み込んでいます…</p>
        </div>
      ) : null}
      {!isAvailabilityLoading && !catalog.availabilityIsLive ? (
        <div className="booking-info-banner is-warning">
          <VishuIcon name="clock" />
          <p><strong>空き状況を確認できません</strong>安全のため日時選択を停止しています。時間をおいて再度お試しください。</p>
        </div>
      ) : null}
      {!isAvailabilityLoading ? <div className="booking-schedule-card">
        <div className="booking-schedule-toolbar">
          <button
            type="button"
            disabled={weekOffset === 0}
            onClick={() => onWeekChange(weekOffset - 1)}
          >
            <VishuIcon name="arrow" />前の一週間
          </button>
          <div>
            <span>SELECT A TIME</span>
            <strong>{formatScheduleHeading(dates)}</strong>
          </div>
          <button
            type="button"
            onClick={() => onWeekChange(weekOffset + 1)}
          >
            次の一週間<VishuIcon name="arrow" />
          </button>
        </div>

        <div className="booking-schedule-scroll">
          <table className="booking-schedule-table">
            <thead>
              <tr>
                <th className="schedule-time-cell">時間</th>
                {dates.map((date) => (
                  <th className={scheduleDateClass(date)} key={dateKey(date)}>
                    <strong>{formatMonthDay(date)}</strong>
                    <small>（{formatWeekday(date)}）</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((row) => (
                <tr key={formatTime(row.time)}>
                  <th className="schedule-time-cell">{formatTime(row.time)}</th>
                  {row.slots.map((slot, index) => {
                    if (!slot) return <td key={dates[index].toISOString()} />;
                    const isSelected =
                      selectedSlot?.getTime() === slot.start.getTime();
                    return (
                      <td key={slot.start.toISOString()}>
                        <button
                          aria-label={`${formatBookingDate(slot.start)} ${slot.available ? "予約可" : "予約不可"}`}
                          aria-pressed={isSelected}
                          className={isSelected ? "is-selected" : ""}
                          disabled={!slot.available}
                          type="button"
                          onClick={() => onSlotSelect(slot.start)}
                        >
                          {slot.available ? "○" : "×"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="booking-schedule-legend">
          <span><i className="is-open">○</i>予約可</span>
          <span><i>×</i>予約不可</span>
          <small>○を選択してください</small>
        </div>
      </div> : null}
    </>
  );
}

function CustomerStep({
  email,
  name,
  phone,
  request,
  fieldErrors,
  nameRef,
  phoneRef,
  requestRef,
  onNameBlur,
  onNameChange,
  onPhoneBlur,
  onPhoneChange,
  onRequestChange,
}: {
  email: string;
  name: string;
  phone: string;
  request: string;
  fieldErrors: BookingFieldErrors;
  nameRef: RefObject<HTMLInputElement | null>;
  phoneRef: RefObject<HTMLInputElement | null>;
  requestRef: RefObject<HTMLTextAreaElement | null>;
  onNameBlur: () => void;
  onNameChange: (value: string) => void;
  onPhoneBlur: () => void;
  onPhoneChange: (value: string) => void;
  onRequestChange: (value: string) => void;
}) {
  return (
    <>
      <div className="subsection-heading"><span>STEP 03</span><h2>お客様情報を入力</h2></div>
      <div className="booking-form-card">
        <div className="booking-form-grid">
          <label><span>お名前 <em>必須</em></span><input ref={nameRef} value={name} onBlur={onNameBlur} onChange={(event) => onNameChange(event.target.value)} placeholder="山田 花子" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "booking-name-error" : undefined} /><small className="field-error field-feedback" id="booking-name-error" aria-live="polite">{fieldErrors.name ?? ""}</small></label>
          <label><span>電話番号 <em>必須</em></span><input ref={phoneRef} autoComplete="tel" inputMode="numeric" pattern="[0-9]*" type="tel" value={phone} onBlur={onPhoneBlur} onChange={(event) => onPhoneChange(event.target.value)} placeholder="09012345678" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "booking-phone-error" : undefined} /><small className="field-error field-feedback" id="booking-phone-error" aria-live="polite">{fieldErrors.phone ?? ""}</small></label>
          <label className="is-wide"><span>メールアドレス</span><input value={email} disabled /></label>
          <label className="is-wide"><span>ご要望・ご相談</span><textarea ref={requestRef} value={request} onChange={(event) => onRequestChange(event.target.value)} placeholder="髪のお悩みやご希望があればご記入ください。" rows={5} aria-invalid={Boolean(fieldErrors.request)} aria-describedby={fieldErrors.request ? "booking-request-count booking-request-error" : "booking-request-count"} /><span className={`booking-character-count${fieldErrors.request ? " is-error" : ""}`} id="booking-request-count">{request.length} / {FORM_FIELD_LIMITS.inquiryMessage}文字</span><small className="field-error field-feedback" id="booking-request-error" aria-live="polite">{fieldErrors.request ?? ""}</small></label>
        </div>
        <p className="booking-form-note">ご入力いただいた情報は、ご予約の確認とサロンからのご連絡に使用します。</p>
      </div>
    </>
  );
}

function bookingFieldErrors(
  name: string,
  phone: string,
  request: string,
): BookingFieldErrors {
  return {
    name: personNameValidationMessage(name, "お名前") ?? undefined,
    phone: requiredPhoneValidationMessage(phone) ?? undefined,
    request: request.length > FORM_FIELD_LIMITS.inquiryMessage
      ? "ご要望・ご相談は300文字以内で入力してください。"
      : undefined,
  };
}

function focusField(
  field: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
) {
  requestAnimationFrame(() => {
    field.current?.focus();
    field.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function ConfirmationStep({
  email,
  menu,
  name,
  phone,
  request,
  slot,
  confirmedVisitNotice,
  confirmedSalonNotice,
  confirmedLongHairCharge,
  onVisitNoticeChange,
  onSalonNoticeChange,
  onLongHairChargeChange,
}: {
  email: string;
  menu: BookingMenu;
  name: string;
  phone: string;
  request: string;
  slot: Date;
  confirmedVisitNotice: boolean;
  confirmedSalonNotice: boolean;
  confirmedLongHairCharge: boolean;
  onVisitNoticeChange: (value: boolean) => void;
  onSalonNoticeChange: (value: boolean) => void;
  onLongHairChargeChange: (value: boolean) => void;
}) {
  return (
    <>
      <div className="subsection-heading"><span>STEP 04</span><h2>ご予約内容を確認</h2></div>
      <div className="booking-confirmation-card">
        <ConfirmationRow label="メニュー" value={menu.title} detail={`${menu.durationMinutes}分 · ${priceLabel(menu)}`} />
        <ConfirmationRow label="日時" value={formatBookingDate(slot)} />
        <ConfirmationRow label="お客様" value={name} detail={`${phone}${email ? ` · ${email}` : ""}`} />
        <ConfirmationRow label="ご要望" value={request || "なし"} />
      </div>
      <div className="booking-confirmation-notices">
        <h3>サロンからお客様への確認事項</h3>
        <RequiredConfirmation
          checked={confirmedVisitNotice}
          title="ご来店に際してのご注意事項"
          onChange={onVisitNoticeChange}
        >
          お客様から当日キャンセル、10分以上遅れる場合はご連絡ください。また、大幅に遅れる場合は、メニューを変更させていただく場合がございます。
        </RequiredConfirmation>
        <RequiredConfirmation
          checked={confirmedSalonNotice}
          title="サロンからの質問"
          onChange={onSalonNoticeChange}
        >
          私自身子供がいて、一人サロンのため、当日やむを得ず、こちらからのキャンセルをさせていただく場合がございます。ご了承いただけました方は、確認欄をタップください。
        </RequiredConfirmation>
        {menu.needsExtraMoney ? (
          <RequiredConfirmation
            checked={confirmedLongHairCharge}
            title="ロング料金について"
            onChange={onLongHairChargeChange}
          >
            髪の長さに応じて、パーマ剤・薬剤・その他トリートメントの使用量が変動します。ロング料金（550~円)にご了承いただけました方は、確認欄をタップください
          </RequiredConfirmation>
        ) : null}
      </div>
      <div className="booking-policy-note"><VishuIcon name="leaf" /><p>すべての必須項目をご確認のうえ、予約を確定してください。</p></div>
    </>
  );
}

function RequiredConfirmation({
  checked,
  children,
  onChange,
  title,
}: {
  checked: boolean;
  children: React.ReactNode;
  onChange: (value: boolean) => void;
  title: string;
}) {
  return (
    <label className="booking-required-confirmation">
      <input
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong><em>必須</em>{title}</strong>
        <small>{children}</small>
        <b>確認しました。</b>
      </span>
    </label>
  );
}

function ConfirmationRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="confirmation-row"><span>{label}</span><div><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</div></div>;
}

function BookingSummary({
  reservationSubmission,
  currentStep,
  menu,
  slot,
  canContinue,
  canConfirm,
  onContinue,
  onConfirm,
}: {
  reservationSubmission: ReservationSubmission;
  currentStep: Step;
  menu: BookingMenu | null;
  slot: Date | null;
  canContinue: boolean;
  canConfirm: boolean;
  onContinue: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <aside className="booking-summary">
      <p className="eyebrow">YOUR BOOKING</p>
      <h2>ご予約内容</h2>
      {menu ? (
        <div className="summary-selection">
          <span>{categoryLabel(menu)}</span><strong>{menu.title}</strong>
          <div><small><VishuIcon name="clock" />{menu.durationMinutes}分</small><b>{priceLabel(menu)}</b></div>
        </div>
      ) : (
        <div className="summary-empty"><VishuIcon name="leaf" /><p>メニューを選ぶと、<br />こちらに内容が表示されます。</p></div>
      )}
      {slot ? <div className="summary-date"><small>ご予約日時</small><strong>{formatBookingDate(slot)}</strong></div> : null}
      {menu?.isCallable ? <div className="booking-summary-alert">このメニューはお電話でのご予約をお願いします。</div> : null}
      {reservationSubmission.status === "success" ? (
        <div className="booking-summary-alert is-success" role="status">
          <strong>ご予約が確定しました</strong>
          <span>予約番号：{reservationSubmission.reservationId}</span>
          <Link href="/mypage/reservations">予約履歴で確認する</Link>
        </div>
      ) : null}
      {reservationSubmission.status === "error" ? (
        <div className="booking-summary-alert is-error" role="alert">
          {reservationSubmission.message}
        </div>
      ) : null}
      {currentStep < 3 ? (
        <button className="button button-primary" type="button" disabled={!canContinue} onClick={onContinue}>
          {continueLabel(currentStep, menu)}<VishuIcon name="arrow" />
        </button>
      ) : (
        <button
          className="button button-primary"
          type="button"
          disabled={!canConfirm || reservationSubmission.status === "submitting" || reservationSubmission.status === "success"}
          onClick={() => void onConfirm()}
        >
          {reservationSubmission.status === "submitting"
            ? "予約を保存しています…"
            : reservationSubmission.status === "success"
              ? "予約が確定しました"
              : "予約を確定する"}
          {reservationSubmission.status === "idle" || reservationSubmission.status === "error" ? <VishuIcon name="arrow" /> : null}
        </button>
      )}
      <p className="booking-secure-note"><VishuIcon name="lock" />ログイン情報で安全に予約を管理します</p>
    </aside>
  );
}

function BookingLoading() {
  return <div className="booking-state-card is-loading"><span className="booking-spinner" /><p>メニューを読み込んでいます…</p></div>;
}

function nextDates(count: number, offsetDays = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() + offsetDays);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
}

function availabilityRange(dates: Date[]) {
  const from = dates[0];
  const until = new Date(from);
  until.setDate(until.getDate() + dates.length);
  return { from, until };
}

function scheduleWhenIdle(action: () => void) {
  const requestIdleCallback = window.requestIdleCallback?.bind(window);
  if (requestIdleCallback) {
    const requestId = requestIdleCallback(action, { timeout: 2_000 });
    return () => window.cancelIdleCallback(requestId);
  }

  const timeoutId = window.setTimeout(action, 300);
  return () => window.clearTimeout(timeoutId);
}

function menuIcon(menu: BookingMenu): "cut" | "sparkle" | "spa" {
  const text = `${menu.title} ${menu.categories.join(" ")}`;
  if (text.includes("カット")) return "cut";
  if (text.includes("カラー")) return "sparkle";
  return "spa";
}

function categoryLabel(menu: BookingMenu) {
  return menu.categories.map(categoryDisplayLabel).join(" ・ ") || "SALON MENU";
}

function priceLabel(menu: BookingMenu) {
  if (menu.price <= 0) return "料金はお問い合わせください";
  const price = `¥${menu.price.toLocaleString("ja-JP")}`;
  return menu.needsExtraMoney ? `${price}〜` : price;
}

function continueLabel(step: Step, menu: BookingMenu | null) {
  if (step === 0 && menu?.isCallable) return "お電話でご予約ください";
  if (step === 0) return "日時選択へ";
  if (step === 1) return "お客様情報へ";
  return "予約内容を確認";
}

function stepDescription(step: Step) {
  return ["ご希望のメニューを選択してください。", "空いている日時からご希望の時間をお選びください。", "ご予約に必要なお客様情報を入力してください。", "内容をご確認ください。"][step];
}

function sameDay(left: Date, right: Date) {
  return dateKey(left) === dateKey(right);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);
}

function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
}

function formatScheduleHeading(dates: Date[]) {
  const first = dates[0];
  const last = dates.at(-1);
  if (!first || !last) return "";
  if (first.getMonth() === last.getMonth()) {
    return `${first.getFullYear()}年${first.getMonth() + 1}月`;
  }
  return `${first.getFullYear()}年${first.getMonth() + 1}月–${last.getMonth() + 1}月`;
}

function scheduleDateClass(date: Date) {
  const classes = [];
  if (date.getDay() === 0) classes.push("is-sunday");
  if (date.getDay() === 6) classes.push("is-saturday");
  if (sameDay(date, new Date())) classes.push("is-today");
  return classes.join(" ");
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function formatBookingDate(date: Date) {
  return `${new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(date)} ${formatTime(date)}`;
}
