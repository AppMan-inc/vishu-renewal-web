"use client";

import { useEffect, useMemo, useState } from "react";
import { VishuIcon } from "@/components/vishu-ui";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  BookingCatalog,
  BookingMenu,
  loadBookingCatalog,
  loadBookingCustomerProfile,
  TimeRange,
} from "@/features/booking/booking-data";

const steps = ["メニュー", "日時", "お客様情報", "確認"];
const categories = [
  { id: "all", label: "すべて", terms: [] },
  { id: "cut", label: "カット", terms: ["カット", "cut"] },
  { id: "color", label: "カラー", terms: ["カラー", "color"] },
  { id: "treatment", label: "トリートメント", terms: ["トリートメント", "treatment"] },
  { id: "perm", label: "パーマ", terms: ["パーマ", "perm"] },
  { id: "straight", label: "縮毛矯正", terms: ["縮毛矯正", "ストレート"] },
  { id: "hair-set", label: "ヘアセット", terms: ["ヘアセット", "hair set"] },
  { id: "kimono", label: "着付け", terms: ["着付け", "着付"] },
  { id: "other", label: "その他", terms: [] },
];

type Step = 0 | 1 | 2 | 3;

export function BookingFlow() {
  const currentUser = firebaseAuth().currentUser;
  const [catalog, setCatalog] = useState<BookingCatalog | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMenu, setSelectedMenu] = useState<BookingMenu | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const dates = useMemo(() => nextDates(7, weekOffset * 7), [weekOffset]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [customerName, setCustomerName] = useState(currentUser?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [request, setRequest] = useState("");
  const [confirmationNotice, setConfirmationNotice] = useState(false);

  useEffect(() => {
    let isActive = true;
    loadBookingCatalog()
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

  const visibleMenus = useMemo(() => {
    const menus = catalog?.menus ?? [];
    const category = categories.find((item) => item.id === selectedCategory);
    if (!category || category.id === "all") return menus;
    if (category.id === "other") {
      const mainCategories = categories.filter(
        (item) => item.id !== "all" && item.id !== "other",
      );
      return menus.filter(
        (menu) => !mainCategories.some((item) => menuMatches(menu, item.terms)),
      );
    }
    return menus.filter((menu) => menuMatches(menu, category.terms));
  }, [catalog, selectedCategory]);

  function chooseMenu(menu: BookingMenu) {
    setSelectedMenu(menu);
    setSelectedSlot(null);
    setConfirmationNotice(false);
  }

  function goForward() {
    if (currentStep === 0 && selectedMenu && !selectedMenu.isCallable) {
      setCurrentStep(1);
      return;
    }
    if (currentStep === 1 && selectedSlot) {
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2 && customerName.trim() && phone.trim()) {
      setCurrentStep(3);
    }
  }

  function goBack() {
    setConfirmationNotice(false);
    setCurrentStep((step) => Math.max(0, step - 1) as Step);
  }

  const canContinue =
    (currentStep === 0 && Boolean(selectedMenu) && !selectedMenu?.isCallable) ||
    (currentStep === 1 && Boolean(selectedSlot)) ||
    (currentStep === 2 && Boolean(customerName.trim()) && Boolean(phone.trim()));

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
              menus={visibleMenus}
              selectedCategory={selectedCategory}
              selectedMenu={selectedMenu}
              onCategoryChange={setSelectedCategory}
              onMenuSelect={chooseMenu}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          ) : null}
          {currentStep === 1 && catalog && selectedMenu ? (
            <DateTimeStep
              catalog={catalog}
              dates={dates}
              menu={selectedMenu}
              selectedSlot={selectedSlot}
              weekOffset={weekOffset}
              onWeekChange={(offset) => {
                setWeekOffset(offset);
                setSelectedSlot(null);
              }}
              onSlotSelect={setSelectedSlot}
            />
          ) : null}
          {currentStep === 2 ? (
            <CustomerStep
              email={currentUser?.email ?? ""}
              name={customerName}
              phone={phone}
              request={request}
              onNameChange={setCustomerName}
              onPhoneChange={setPhone}
              onRequestChange={setRequest}
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
            />
          ) : null}

          {currentStep > 0 ? (
            <button className="booking-inline-back" type="button" onClick={goBack}>
              <VishuIcon name="arrow" />
              前のステップへ戻る
            </button>
          ) : null}
        </section>

        <BookingSummary
          confirmationNotice={confirmationNotice}
          currentStep={currentStep}
          menu={selectedMenu}
          slot={selectedSlot}
          canContinue={canContinue}
          onContinue={goForward}
          onConfirm={() => setConfirmationNotice(true)}
        />
      </div>
    </section>
  );
}

function BookingProgress({ currentStep }: { currentStep: Step }) {
  return (
    <ol className="booking-progress" aria-label="予約の進行状況">
      {steps.map((step, index) => (
        <li
          className={index === currentStep ? "is-current" : index < currentStep ? "is-complete" : ""}
          key={step}
        >
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  );
}

type MenuStepProps = {
  catalog: BookingCatalog | null;
  hasError: boolean;
  menus: BookingMenu[];
  selectedCategory: string;
  selectedMenu: BookingMenu | null;
  onCategoryChange: (category: string) => void;
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

      <div className="booking-category-list" aria-label="メニューカテゴリ">
        {categories.map((category) => (
          <button
            className={category.id === props.selectedCategory ? "is-selected" : ""}
            key={category.id}
            type="button"
            onClick={() => props.onCategoryChange(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {!props.catalog && !props.hasError ? <BookingLoading /> : null}
      {props.hasError ? (
        <div className="booking-state-card">
          <VishuIcon name="leaf" />
          <h3>メニューを読み込めませんでした</h3>
          <button className="button button-quiet" type="button" onClick={props.onRetry}>もう一度試す</button>
        </div>
      ) : null}
      {props.catalog && props.menus.length === 0 ? (
        <div className="booking-state-card"><p>該当するメニューがありません。</p></div>
      ) : null}

      <div className="booking-menu-list">
        {props.menus.map((menu) => (
          <button
            aria-pressed={props.selectedMenu?.id === menu.id}
            className={`booking-menu-card${props.selectedMenu?.id === menu.id ? " is-selected" : ""}`}
            key={menu.id}
            type="button"
            onClick={() => props.onMenuSelect(menu)}
          >
            <div className="booking-menu-icon"><VishuIcon name={menuIcon(menu)} /></div>
            <div className="booking-menu-copy">
              <span>{categoryLabel(menu)}</span>
              <h3>{menu.title}</h3>
              <p>{menu.description}</p>
              <div className="booking-menu-price">{priceLabel(menu)}</div>
            </div>
            <div className="booking-menu-meta">
              <span><VishuIcon name="clock" />{menu.durationMinutes}分</span>
              {menu.isCallable ? <small>要電話予約</small> : null}
              <span className="round-arrow"><VishuIcon name="arrow" /></span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function DateTimeStep({
  catalog,
  dates,
  menu,
  selectedSlot,
  weekOffset,
  onWeekChange,
  onSlotSelect,
}: {
  catalog: BookingCatalog;
  dates: Date[];
  menu: BookingMenu;
  selectedSlot: Date | null;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  onSlotSelect: (slot: Date) => void;
}) {
  const scheduleRows = useMemo(() => {
    const columns = dates.map((date) => slotsForDate(date, menu, catalog));
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
        <div className="booking-menu-icon"><VishuIcon name={menuIcon(menu)} /></div>
        <div><small>選択中のメニュー</small><strong>{menu.title}</strong><span>{menu.durationMinutes}分 · {priceLabel(menu)}</span></div>
      </div>
      {!catalog.availabilityIsLive ? (
        <div className="booking-info-banner is-warning">
          <VishuIcon name="clock" />
          <p><strong>確認用の空き枠です</strong>予約・休業データの読み取り接続後にリアルタイム表示へ切り替わります。</p>
        </div>
      ) : null}
      <div className="booking-schedule-card">
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
                <th className="schedule-time-cell is-right">時間</th>
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
                  <th className="schedule-time-cell is-right">{formatTime(row.time)}</th>
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
      </div>
    </>
  );
}

function CustomerStep({
  email,
  name,
  phone,
  request,
  onNameChange,
  onPhoneChange,
  onRequestChange,
}: {
  email: string;
  name: string;
  phone: string;
  request: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onRequestChange: (value: string) => void;
}) {
  return (
    <>
      <div className="subsection-heading"><span>STEP 03</span><h2>お客様情報を入力</h2></div>
      <div className="booking-form-card">
        <div className="booking-form-grid">
          <label><span>お名前 <em>必須</em></span><input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="山田 花子" /></label>
          <label><span>電話番号 <em>必須</em></span><input inputMode="tel" value={phone} onChange={(event) => onPhoneChange(event.target.value)} placeholder="09012345678" /></label>
          <label className="is-wide"><span>メールアドレス</span><input value={email} disabled /></label>
          <label className="is-wide"><span>ご要望・ご相談</span><textarea value={request} onChange={(event) => onRequestChange(event.target.value)} placeholder="髪のお悩みやご希望があればご記入ください。" rows={5} /></label>
        </div>
        <p className="booking-form-note">ご入力いただいた情報は、ご予約の確認とサロンからのご連絡に使用します。</p>
      </div>
    </>
  );
}

function ConfirmationStep({
  email,
  menu,
  name,
  phone,
  request,
  slot,
}: {
  email: string;
  menu: BookingMenu;
  name: string;
  phone: string;
  request: string;
  slot: Date;
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
      <div className="booking-policy-note"><VishuIcon name="leaf" /><p>内容をご確認のうえ予約を確定してください。確定後の変更・キャンセルはサロンへご連絡ください。</p></div>
    </>
  );
}

function ConfirmationRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="confirmation-row"><span>{label}</span><div><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</div></div>;
}

function BookingSummary({
  confirmationNotice,
  currentStep,
  menu,
  slot,
  canContinue,
  onContinue,
  onConfirm,
}: {
  confirmationNotice: boolean;
  currentStep: Step;
  menu: BookingMenu | null;
  slot: Date | null;
  canContinue: boolean;
  onContinue: () => void;
  onConfirm: () => void;
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
      {confirmationNotice ? <div className="booking-summary-alert is-success">予約保存APIは次の実装で接続します。現在はまだ予約データを保存していません。</div> : null}
      {currentStep < 3 ? (
        <button className="button button-primary" type="button" disabled={!canContinue} onClick={onContinue}>
          {continueLabel(currentStep, menu)}<VishuIcon name="arrow" />
        </button>
      ) : (
        <button className="button button-primary" type="button" onClick={onConfirm}>予約を確定する<VishuIcon name="arrow" /></button>
      )}
      <p className="booking-secure-note"><VishuIcon name="lock" />ログイン情報で安全に予約を管理します</p>
    </aside>
  );
}

function BookingLoading() {
  return <div className="booking-state-card is-loading"><span className="booking-spinner" /><p>メニューを読み込んでいます…</p></div>;
}

function slotsForDate(date: Date, menu: BookingMenu, catalog: BookingCatalog) {
  const result: { start: Date; available: boolean }[] = [];
  const now = new Date();
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  for (let minutes = catalog.openingMinutes; minutes < catalog.closingMinutes; minutes += catalog.slotIntervalMinutes) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes / 60), minutes % 60);
    const end = new Date(start.getTime() + menu.durationMinutes * 60_000);
    const closesAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(catalog.closingMinutes / 60), catalog.closingMinutes % 60);
    const available =
      start > now &&
      !catalog.closedWeekdays.has(weekday) &&
      end <= closesAt &&
      !overlapsAny(start, end, catalog.reservations) &&
      !overlapsAny(start, end, catalog.restBlocks);
    result.push({ start, available });
  }
  return result;
}

function overlapsAny(start: Date, end: Date, ranges: TimeRange[]) {
  return ranges.some((range) => start < range.end && range.start < end);
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

function menuMatches(menu: BookingMenu, terms: string[]) {
  const values = [menu.title, ...menu.categories].map((value) => value.toLowerCase());
  return terms.some((term) => values.some((value) => value.includes(term.toLowerCase())));
}

function menuIcon(menu: BookingMenu): "cut" | "sparkle" | "spa" {
  const text = `${menu.title} ${menu.categories.join(" ")}`;
  if (text.includes("カット")) return "cut";
  if (text.includes("カラー")) return "sparkle";
  return "spa";
}

function categoryLabel(menu: BookingMenu) {
  return menu.categories[0] || "SALON MENU";
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
