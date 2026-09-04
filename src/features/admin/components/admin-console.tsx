"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Brand, VishuIcon } from "@/components/vishu-ui";
import {
  AdminApiError,
  fetchAdminSnapshot,
  mutateAdmin,
  uploadAdminMenuImage,
} from "@/features/admin/admin-api";
import type {
  AdminCustomer,
  AdminMenu,
  AdminReservation,
  AdminSection,
  AdminSnapshot,
  ReservationStatus,
} from "@/features/admin/types";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  addMinutes,
  availableRestSlotKeysForDay,
  buildRestChanges,
  MAX_REST_ADVANCE_DAYS,
  rangesOverlap,
  restSlotState,
  slotKey,
  toggleRestSlotSelection,
  type RestSlotState,
} from "@/features/admin/rest-schedule";
import { japaneseHolidayName } from "@/features/admin/japanese-holidays";
import {
  canonicalCategoryIds,
  isCoupon,
  menuCategories,
  toggleCategory,
} from "@/features/booking/booking-menu-catalog";
import { isClosureBlock } from "@/features/admin/admin-rest-blocks";

const navigation: Array<{ section: AdminSection; href: string; label: string; icon: "bell" | "calendar" | "clock" | "person" | "spa" | "sparkle" }> = [
  { section: "dashboard", href: "/admin", label: "ホーム", icon: "sparkle" },
  { section: "reservations", href: "/admin/reservations", label: "予約", icon: "calendar" },
  { section: "rests", href: "/admin/rests", label: "休憩", icon: "clock" },
  { section: "customers", href: "/admin/customers", label: "顧客・カルテ", icon: "person" },
  { section: "menus", href: "/admin/menus", label: "メニュー", icon: "spa" },
  { section: "notifications", href: "/admin/notifications", label: "お知らせ配信", icon: "bell" },
];

type AdminConsoleContextValue = {
  snapshot: AdminSnapshot | null;
  loading: boolean;
  error: string;
  notice: string;
  mutating: boolean;
  refresh: () => Promise<void>;
  runMutation: (body: Record<string, unknown>, successMessage: string) => Promise<boolean>;
  signOutAdmin: () => Promise<void>;
};

const AdminConsoleContext = createContext<AdminConsoleContextValue | null>(null);

export function AdminConsoleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorPath, setErrorPath] = useState("");
  const [notice, setNotice] = useState("");
  const [noticePath, setNoticePath] = useState("");
  const [mutating, setMutating] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      setSnapshot(await fetchAdminSnapshot());
    } catch (caught) {
      console.error("[admin-console] refresh_failed", {
        errorName: caught instanceof Error ? caught.name : typeof caught,
        message: caught instanceof Error ? caught.message : undefined,
        requestId: caught instanceof AdminApiError ? caught.requestId : undefined,
        status: caught instanceof AdminApiError ? caught.status : undefined,
      });
      if (caught instanceof AdminApiError && caught.status === 401) {
        console.warn("[admin-console] redirecting_to_login", {
          path: location.pathname,
          requestId: caught.requestId,
          status: caught.status,
        });
        router.replace(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
        return;
      }
      const message = caught instanceof Error
        ? caught.message
        : "管理データを取得できませんでした。";
      const requestReference = caught instanceof AdminApiError && caught.requestId
        ? `（Request ID: ${caught.requestId}）`
        : "";
      setError(`${message}${requestReference}`);
      setErrorPath(location.pathname);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    return onAuthStateChanged(
      firebaseAuth(),
      (user) => {
        if (!user) {
          setSnapshot(null);
          console.warn("[admin-console] session_missing", {
            path: location.pathname,
          });
          router.replace(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
          return;
        }
        console.info("[admin-console] session_detected", {
          path: location.pathname,
          uid: user.uid,
        });
        void refresh();
      },
      (authError) => {
        console.error("[admin-console] session_check_failed", {
          code: (authError as { code?: unknown }).code ?? "unknown",
          errorName: authError.name,
          path: location.pathname,
        });
        setError("ログイン状態を確認できませんでした。ページを再読み込みしてください。");
        setErrorPath(location.pathname);
        setLoading(false);
      },
    );
  }, [refresh, router]);

  const runMutation = useCallback(async (body: Record<string, unknown>, successMessage: string) => {
    setMutating(true);
    setError("");
    setNotice("");
    try {
      await mutateAdmin(body);
      await refresh();
      setNotice(successMessage);
      setNoticePath(location.pathname);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新に失敗しました。");
      setErrorPath(location.pathname);
      return false;
    } finally {
      setMutating(false);
    }
  }, [refresh]);

  const signOutAdmin = useCallback(async () => {
    setSnapshot(null);
    await signOut(firebaseAuth());
    router.replace("/login");
  }, [router]);

  const value = useMemo<AdminConsoleContextValue>(() => ({
    snapshot,
    loading,
    error: errorPath === pathname ? error : "",
    notice: noticePath === pathname ? notice : "",
    mutating,
    refresh,
    runMutation,
    signOutAdmin,
  }), [
    error,
    errorPath,
    loading,
    mutating,
    notice,
    noticePath,
    pathname,
    refresh,
    runMutation,
    signOutAdmin,
    snapshot,
  ]);

  return <AdminConsoleContext.Provider value={value}>{children}</AdminConsoleContext.Provider>;
}

function useAdminConsole() {
  const context = useContext(AdminConsoleContext);
  if (!context) {
    throw new Error("AdminConsole must be rendered inside AdminConsoleProvider.");
  }
  return context;
}

export function AdminMenusConsole() {
  const searchParams = useSearchParams();
  return <AdminConsole menuId={searchParams.get("menuId") ?? undefined} section="menus" />;
}

export function AdminConsole({ section, menuId }: { section: AdminSection; menuId?: string }) {
  const {
    snapshot,
    loading,
    error,
    notice,
    mutating,
    refresh,
    runMutation,
    signOutAdmin,
  } = useAdminConsole();

  if (loading) return <AdminLoading />;

  return (
    <main className="admin-console-page">
      <header className="admin-console-header">
        <Brand owner />
        <div>
          {snapshot ? <span>{snapshot.session.email || "Salon owner"}</span> : null}
          <button onClick={() => void refresh()} type="button">再読込</button>
          <button onClick={() => void signOutAdmin()} type="button">ログアウト</button>
        </div>
      </header>
      <div className="admin-console-layout">
        <nav className="admin-console-nav" aria-label="管理メニュー">
          {navigation.map((item) => (
            <Link className={item.section === section ? "is-active" : ""} href={item.href} key={item.section}>
              <VishuIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-console-main">
          {error ? <div className="admin-alert is-error" role="alert">{error}</div> : null}
          {notice ? <div className="admin-alert is-success" role="status">{notice}</div> : null}
          {!snapshot ? (
            <EmptyState title="管理画面を表示できません" text="Firebase Admin設定と管理者権限を確認してください。" />
          ) : (
            <div className="admin-console-view" key={section}>
              <AdminSectionContent
                mutating={mutating}
                runMutation={runMutation}
                section={section}
                menuId={menuId}
                snapshot={snapshot}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function AdminSectionContent(props: {
  section: AdminSection;
  menuId?: string;
  snapshot: AdminSnapshot;
  mutating: boolean;
  runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean>;
}) {
  switch (props.section) {
    case "dashboard": return <Dashboard snapshot={props.snapshot} />;
    case "reservations": return <Reservations snapshot={props.snapshot} runMutation={props.runMutation} mutating={props.mutating} />;
    case "rests": return <Rests snapshot={props.snapshot} runMutation={props.runMutation} mutating={props.mutating} />;
    case "customers": return <Customers snapshot={props.snapshot} runMutation={props.runMutation} mutating={props.mutating} />;
    case "menus": return <Menus menuId={props.menuId} snapshot={props.snapshot} runMutation={props.runMutation} mutating={props.mutating} />;
    case "notifications": return <Notifications snapshot={props.snapshot} runMutation={props.runMutation} mutating={props.mutating} />;
  }
}

function Dashboard({ snapshot }: { snapshot: AdminSnapshot }) {
  const today = dayKey(new Date());
  const month = monthKey(new Date());
  const todayReservations = snapshot.reservations.filter((item) => dayKey(new Date(item.startTime)) === today && item.status !== "canceled");
  const next = snapshot.reservations.find((item) => new Date(item.startTime) > new Date() && item.status === "confirmed");
  const monthVisits = snapshot.reservations.filter((item) => monthKey(new Date(item.startTime)) === month && item.status === "visited");
  const modules = navigation.slice(1).map((item) => ({
    ...item,
    description: {
      dashboard: "サロン全体の状況を確認",
      reservations: "週・月カレンダーで予約を確認",
      rests: "予約と重ならない休憩枠を登録",
      customers: "顧客情報と施術カルテを管理",
      menus: "料金・所要時間・公開条件を編集",
      notifications: "全ユーザーまたは個人へお知らせを配信",
    }[item.section],
  }));
  return (
    <>
      <PageTitle eyebrow="OWNER CONSOLE" title="おかえりなさい。" description="Salon Vishuの今日と、これからの予約を確認できます。" />
      <div className="admin-console-stats">
        <Metric icon="calendar" label="本日の予約" value={`${todayReservations.length}件`} />
        <Metric icon="clock" label="次のご予約" value={next ? `${formatTime(next.startTime)} ${next.customerName}` : "予定なし"} compact />
        <Metric icon="sparkle" label="今月の来店" value={`${monthVisits.length}名`} />
      </div>
      <section className="admin-console-section">
        <SectionHeading eyebrow="MANAGEMENT" title="管理メニュー" />
        <div className="admin-console-module-grid">
          {modules.map((module) => (
            <Link href={module.href} key={module.section}>
              <VishuIcon name={module.icon} />
              <div><h3>{module.label}</h3><p>{module.description}</p></div>
              <span>→</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function Reservations(props: {
  snapshot: AdminSnapshot;
  mutating: boolean;
  runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean>;
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(startOfDay(new Date()));
  const [status, setStatus] = useState<"active" | "all" | ReservationStatus>("active");
  const [selected, setSelected] = useState<AdminReservation | null>(null);
  const visible = props.snapshot.reservations.filter((item) => status === "all" || (status === "active" ? item.status !== "canceled" : item.status === status));
  const days = view === "week" ? weekDays(anchor) : monthCalendarDays(anchor);
  const move = (direction: number) => setAnchor((current) => addDays(view === "week" ? current : new Date(current.getFullYear(), current.getMonth() + direction, 1), view === "week" ? direction * 7 : 0));

  async function updateStatus(nextStatus: ReservationStatus) {
    if (!selected) return;
    if (nextStatus === "canceled" && !confirm("本当にキャンセルしますか？")) return;
    const ok = await props.runMutation({ action: "reservation.status", sourcePath: selected.sourcePath, status: nextStatus }, "予約ステータスを更新しました。");
    if (ok) setSelected(null);
  }

  return (
    <>
      <PageTitle eyebrow="RESERVATIONS" title="予約カレンダー" description="予約・休憩・休業を同じカレンダーで確認できます。" />
      <div className="admin-toolbar">
        <div className="admin-segmented"><button className={view === "week" ? "is-active" : ""} onClick={() => setView("week")}>週</button><button className={view === "month" ? "is-active" : ""} onClick={() => setView("month")}>月</button></div>
        <div className="admin-period-controls"><button onClick={() => move(-1)}>‹</button><button onClick={() => setAnchor(startOfDay(new Date()))}>今日</button><button onClick={() => move(1)}>›</button><strong>{view === "week" ? weekLabel(anchor) : monthLabel(anchor)}</strong></div>
        <select aria-label="ステータス" onChange={(event) => setStatus(event.target.value as typeof status)} value={status}><option value="active">キャンセル以外</option><option value="all">すべて</option><option value="confirmed">予約済み</option><option value="visited">来店済み</option><option value="canceled">キャンセル</option></select>
        <Link className="admin-rest-register-link" href="/admin/rests"><VishuIcon name="clock" />休憩登録</Link>
      </div>
      {view === "week" ? (
        <div className="admin-week-grid">
          {days.map((day) => {
            const reservations = visible.filter((item) => dayKey(new Date(item.startTime)) === dayKey(day));
            const rests = props.snapshot.restBlocks.filter((item) => dayKey(new Date(item.startTime)) === dayKey(day));
            return <section className={dayKey(day) === dayKey(new Date()) ? "is-today" : ""} key={day.toISOString()}><header><span>{weekday(day)}</span><strong>{day.getDate()}</strong></header><div>{[...reservations.map((item) => ({ type: "reservation" as const, start: item.startTime, item })), ...rests.map((item) => ({ type: "rest" as const, start: item.startTime, item }))].sort((a, b) => a.start.localeCompare(b.start)).map((event) => event.type === "reservation" ? <button className={`admin-calendar-event status-${event.item.status}`} key={event.item.sourcePath} onClick={() => setSelected(event.item)}><time>{formatTime(event.item.startTime)}</time><strong>{event.item.customerName}</strong><span>{event.item.treatmentDetail}</span><small className="admin-calendar-previous">{previousVisitText(event.item)}</small></button> : <div className={`admin-calendar-event ${isClosureBlock(event.item) ? "is-closure" : "is-rest"}`} key={event.item.id}><time>{formatTime(event.item.startTime)}–{formatTime(event.item.endTime)}</time><strong>{isClosureBlock(event.item) ? "休業" : "休憩"}</strong></div>)}{reservations.length === 0 && rests.length === 0 ? <p className="admin-calendar-empty">予定なし</p> : null}</div></section>;
          })}
        </div>
      ) : (
        <div className="admin-month-grid">
          {days.map((day) => {
            const dayReservations = visible.filter((item) => dayKey(new Date(item.startTime)) === dayKey(day));
            const dayBlocks = props.snapshot.restBlocks.filter((item) => dayKey(new Date(item.startTime)) === dayKey(day));
            const restCount = dayBlocks.filter((item) => !isClosureBlock(item)).length;
            const closureCount = dayBlocks.filter(isClosureBlock).length;
            return <section className={`${day.getMonth() !== anchor.getMonth() ? "is-outside" : ""} ${dayKey(day) === dayKey(new Date()) ? "is-today" : ""}`} key={day.toISOString()}><header>{day.getDate()}</header>{dayReservations.slice(0, 3).map((item) => <button key={item.sourcePath} onClick={() => setSelected(item)}><span><time>{formatTime(item.startTime)}</time> {item.customerName}</span><small>{previousVisitText(item)}</small></button>)}{dayReservations.length > 3 ? <small>ほか{dayReservations.length - 3}件</small> : null}{restCount ? <small>休憩 {restCount}件</small> : null}{closureCount ? <small>休業 {closureCount}件</small> : null}</section>;
          })}
        </div>
      )}
      {selected ? <ReservationDetail reservation={selected} mutating={props.mutating} onClose={() => setSelected(null)} onStatus={updateStatus} /> : null}
    </>
  );
}

function ReservationDetail({ reservation, mutating, onClose, onStatus }: { reservation: AdminReservation; mutating: boolean; onClose: () => void; onStatus: (status: ReservationStatus) => void }) {
  return <div className="admin-detail-overlay" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="admin-detail-panel"><button className="admin-detail-close" onClick={onClose}>×</button><p className="eyebrow">RESERVATION DETAIL</p><h2>{reservation.customerName}</h2><span className={`admin-status status-${reservation.status}`}>{statusLabel(reservation.status)}</span><dl><div><dt>日時</dt><dd>{formatDateTime(reservation.startTime)} – {formatTime(reservation.finishTime)}</dd></div><div><dt>前回来店</dt><dd>{reservation.previousVisitAt ? formatDateTime(reservation.previousVisitAt) : "初回来店"}</dd></div><div><dt>メニュー</dt><dd>{reservation.treatmentDetail}</dd></div><div><dt>料金</dt><dd>{yen(reservation.price)}</dd></div><div><dt>電話番号</dt><dd>{reservation.telephoneNumber || "未登録"}</dd></div><div><dt>ご希望</dt><dd>{reservation.customerHope || "なし"}</dd></div></dl><div className="admin-detail-actions"><button disabled={mutating || reservation.status === "visited"} onClick={() => void onStatus("visited")}>来店済みにする</button><button disabled={mutating || reservation.status === "confirmed"} onClick={() => void onStatus("confirmed")}>予約済みに戻す</button><button className="is-danger" disabled={mutating || reservation.status === "canceled"} onClick={() => void onStatus("canceled")}>キャンセル</button></div>{reservation.customerId ? <Link className="admin-primary-link" href={`/admin/customers?customer=${encodeURIComponent(reservation.customerId)}`}>顧客・カルテを開く →</Link> : null}</aside></div>;
}

function Rests(props: { snapshot: AdminSnapshot; mutating: boolean; runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const [calendarDate, setCalendarDate] = useState(() => startOfDay(new Date()));
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [pendingDeletionKeys, setPendingDeletionKeys] = useState<Set<string>>(() => new Set());
  const settings = props.snapshot.bookingSettings;
  const hasChanges = selectedKeys.size > 0 || pendingDeletionKeys.size > 0;
  const weekStart = weekDays(calendarDate)[0];
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const slots = Array.from(
    { length: Math.ceil((settings.closingMinutes - settings.openingMinutes) / settings.slotIntervalMinutes) },
    (_, index) => settings.openingMinutes + index * settings.slotIntervalMinutes,
  );

  useEffect(() => {
    if (!hasChanges) return;
    const warnOnUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const warnOnNavigation = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a");
      if (anchor && !confirm("選択中の休憩時間を破棄しますか？\nまだ反映されていない変更があります。")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warnOnUnload);
    document.addEventListener("click", warnOnNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnOnUnload);
      document.removeEventListener("click", warnOnNavigation, true);
    };
  }, [hasChanges]);

  function clearSelection() {
    setSelectedKeys(new Set());
    setPendingDeletionKeys(new Set());
  }

  function toggleSlot(start: Date, state: RestSlotState) {
    if (props.mutating || state === "reservation" || state === "closure" || state === "unavailable") return;
    const key = slotKey(start);
    const end = addMinutes(start, settings.slotIntervalMinutes);
    const isRegistered = props.snapshot.restBlocks.some((block) =>
      !isClosureBlock(block) && rangesOverlap(
        start,
        end,
        new Date(block.startTime),
        new Date(block.endTime),
      ));
    const next = toggleRestSlotSelection({
      key,
      isRegistered,
      selectedKeys,
      pendingDeletionKeys,
    });
    setSelectedKeys(next.selectedKeys);
    setPendingDeletionKeys(next.pendingDeletionKeys);
  }

  async function applyChanges() {
    if (!hasChanges) return;
    const changes = buildRestChanges(
      selectedKeys,
      pendingDeletionKeys,
      props.snapshot.restBlocks,
      settings.slotIntervalMinutes,
    );
    const registrationCount = selectedKeys.size;
    const deletionCount = pendingDeletionKeys.size;
    const ok = await props.runMutation(
      { action: "rest.apply", ...changes },
      `休憩を更新しました（登録 ${registrationCount}枠・削除 ${deletionCount}枠）。`,
    );
    if (ok) clearSelection();
  }

  async function registerFullDay(day: Date) {
    if (props.mutating) return;
    const availableKeys = availableRestSlotKeysForDay({
      day,
      now: new Date(),
      settings,
      reservations: props.snapshot.reservations,
      restBlocks: props.snapshot.restBlocks,
      selectedKeys,
      pendingDeletionKeys,
    });
    if (availableKeys.length === 0) {
      alert(`${day.getMonth() + 1}月${day.getDate()}日に登録可能な休憩時間はありません。`);
      return;
    }
    const otherChanges = hasChanges
      ? "\n選択中のほかの変更も同時に反映されます。"
      : "";
    if (!confirm(
      `${day.getMonth() + 1}月${day.getDate()}日を1日休憩として登録しますか？\n` +
      `予約・休業などを除く、登録可能な全時間枠（${availableKeys.length}枠）を登録します。${otherChanges}`,
    )) return;

    const nextSelectedKeys = new Set([...selectedKeys, ...availableKeys]);
    const changes = buildRestChanges(
      nextSelectedKeys,
      pendingDeletionKeys,
      props.snapshot.restBlocks,
      settings.slotIntervalMinutes,
    );
    const ok = await props.runMutation(
      { action: "rest.apply", ...changes },
      `${day.getMonth() + 1}月${day.getDate()}日の休憩を登録しました（登録 ${availableKeys.length}枠）。`,
    );
    if (ok) clearSelection();
  }

  async function deleteRest(item: AdminSnapshot["restBlocks"][number]) {
    if (!confirm("休憩を削除しますか？")) return;
    const ok = await props.runMutation(
      { action: "rest.delete", id: item.id },
      "休憩を削除しました。",
    );
    if (!ok) return;
    setPendingDeletionKeys((current) => new Set([...current].filter((key) => {
      const start = new Date(key);
      return !rangesOverlap(
        start,
        addMinutes(start, settings.slotIntervalMinutes),
        new Date(item.startTime),
        new Date(item.endTime),
      );
    })));
  }

  const visibleRests = props.snapshot.restBlocks.filter((block) => {
    const start = new Date(block.startTime);
    return !isClosureBlock(block) && start >= weekStart && start < addDays(weekStart, 7);
  });
  const rangeEnd = addDays(weekStart, 6);
  const today = startOfDay(new Date());
  const currentWeekStart = weekDays(today)[0];
  const maxDate = addDays(today, MAX_REST_ADVANCE_DAYS);
  const canMovePrevious = weekStart > currentWeekStart;
  const canMoveNext = addDays(weekStart, 7) <= maxDate;

  function moveWeek(direction: -1 | 1) {
    const nextWeekStart = addDays(weekStart, direction * 7);
    setCalendarDate(nextWeekStart < currentWeekStart ? today : nextWeekStart);
  }

  function selectCalendarDate(value: string) {
    const selectedDate = dateFromInput(value);
    if (!selectedDate || selectedDate < today || selectedDate > maxDate) return;
    setCalendarDate(selectedDate);
  }

  return <>
    <PageTitle eyebrow="AVAILABILITY" title="休憩登録" description="○をタップして休憩にする時間を選択してください。複数の日時をまとめて登録できます。" />
    <div className="admin-rest-calendar-controls">
      <label className="admin-rest-date-jump">
        <span>表示する日付</span>
        <input
          aria-label="表示する日付"
          disabled={props.mutating}
          max={toDateInput(maxDate)}
          min={toDateInput(today)}
          onChange={(event) => selectCalendarDate(event.target.value)}
          type="date"
          value={toDateInput(calendarDate)}
        />
      </label>
      <div className="admin-rest-week-nav">
        <button aria-label="前の週" disabled={!canMovePrevious || props.mutating} onClick={() => moveWeek(-1)} type="button">‹</button>
        <strong>{weekStart.getFullYear()}/{weekStart.getMonth() + 1}/{weekStart.getDate()} - {rangeEnd.getMonth() + 1}/{rangeEnd.getDate()}</strong>
        <button disabled={props.mutating || dayKey(calendarDate) === dayKey(today)} onClick={() => setCalendarDate(today)} type="button">今日</button>
        <button aria-label="次の週" disabled={!canMoveNext || props.mutating} onClick={() => moveWeek(1)} type="button">›</button>
      </div>
    </div>
    <section className="admin-panel admin-rest-actions">
      <strong>{hasChanges ? `変更中 ${selectedKeys.size + pendingDeletionKeys.size}枠（登録 ${selectedKeys.size}・解除 ${pendingDeletionKeys.size}）` : "時間割から休憩時間を選択してください"}</strong>
      <div>
        <button disabled={!hasChanges || props.mutating} onClick={clearSelection} type="button">すべて解除</button>
        <button className="admin-rest-submit" disabled={!hasChanges || props.mutating} onClick={() => void applyChanges()} type="button">
          {props.mutating
            ? "登録中…"
            : selectedKeys.size > 0
              ? `休憩を登録（${selectedKeys.size}枠）`
              : "変更を反映"}
        </button>
      </div>
    </section>
    <div className="admin-rest-layout">
      <section className="admin-panel admin-rest-schedule-panel">
        <div className="admin-slot-grid">
          <header className="admin-slot-time-header">時間</header>
          {days.map((day) => {
            const holidayName = japaneseHolidayName(day);
            const isSundayOrHoliday = day.getDay() === 0 || Boolean(holidayName);
            const className = [
              dayKey(day) === dayKey(new Date()) ? "is-today" : "",
              isSundayOrHoliday ? "is-holiday" : day.getDay() === 6 ? "is-saturday" : "",
            ].filter(Boolean).join(" ");
            const label = dayKey(day) === dayKey(new Date()) ? "今日" : weekday(day);
            return <header className={className} key={day.toISOString()} title={holidayName ?? undefined}><button aria-label={`${day.getMonth() + 1}月${day.getDate()}日 ${label}${holidayName ? ` ${holidayName}` : ""}を1日休憩として登録`} disabled={props.mutating} onClick={() => void registerFullDay(day)} type="button"><strong>{day.getMonth() + 1}/{day.getDate()}</strong><span>{label}</span></button></header>;
          })}
          {slots.map((minutes) => <div className="admin-slot-row" key={minutes}>
            <time>{minutesLabel(minutes)}</time>
            {days.map((day) => {
              const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
              const state = restSlotState({ slot: start, now: new Date(), settings, reservations: props.snapshot.reservations, restBlocks: props.snapshot.restBlocks, selectedKeys, pendingDeletionKeys });
              const label = state === "reservation" ? "予" : state === "closure" ? "休" : state === "unavailable" ? "－" : state === "available" ? "○" : "×";
              const semantic = state === "reservation" ? "予約済み" : state === "closure" ? "休業" : state === "rest" ? "休憩登録済み" : state === "selected" ? "選択中" : state === "available" ? "休憩登録可能" : "選択不可";
              return <button aria-label={`${start.getMonth() + 1}月${start.getDate()}日 ${minutesLabel(minutes)} ${semantic}`} aria-pressed={state === "selected"} className={`is-${state}`} disabled={props.mutating || state === "reservation" || state === "closure" || state === "unavailable"} key={day.toISOString()} onClick={() => toggleSlot(start, state)} type="button">{label}</button>;
            })}
          </div>)}
        </div>
        <div className="admin-rest-legend" aria-label="時間枠の記号">
          <span><b>○</b> 登録可能</span>
          <span><b>×</b> 休憩</span>
          <span><b>休</b> 休業</span>
          <span><b>予</b> 予約あり</span>
          <span><b>－</b> 選択不可</span>
        </div>
      </section>
      <section className="admin-panel admin-rest-list">
        <SectionHeading eyebrow="REGISTERED" title="表示中の休憩" />
        {visibleRests.map((item) => <article key={item.id}><div><strong>{new Date(item.startTime).getMonth() + 1}/{new Date(item.startTime).getDate()} {formatTime(item.startTime)} - {formatTime(item.endTime)}</strong></div><button disabled={props.mutating} onClick={() => void deleteRest(item)} type="button">削除</button></article>)}
        {visibleRests.length === 0 ? <p>表示中の休憩はありません。</p> : null}
      </section>
    </div>
  </>;
}

function Customers(props: { snapshot: AdminSnapshot; mutating: boolean; runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const selected = props.snapshot.customers.find((item) => item.id === selectedId) ?? null;
  const customers = props.snapshot.customers.filter((item) => `${item.displayName} ${item.telephoneNumber}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageTitle eyebrow="CUSTOMERS & KARTE" title="顧客・カルテ" description="顧客情報、来店履歴、施術カルテをひとつの画面で管理します。" /><div className="admin-customer-layout"><section className="admin-panel admin-customer-list"><label className="admin-search"><VishuIcon name="person" /><input onChange={(event) => setQuery(event.target.value)} placeholder="氏名・電話番号で検索" value={query} /></label>{customers.map((customer) => { const summary = customerSummary(customer, props.snapshot.reservations, props.snapshot.karteEntries); return <button className={selected?.id === customer.id ? "is-active" : ""} key={customer.id} onClick={() => setSelectedId(customer.id)}><div><strong>{customer.displayName}</strong><span>{customer.telephoneNumber || "電話番号未登録"}</span></div><small>来店 {summary.visits}回<br />{summary.lastVisit ? `最終 ${formatDate(summary.lastVisit)}` : "来店履歴なし"}</small>{summary.missingKarte ? <em>カルテ未登録</em> : null}</button>; })}{customers.length === 0 ? <p>該当する顧客はいません。</p> : null}</section><section className="admin-panel admin-customer-detail">{selected ? <CustomerDetail customer={selected} snapshot={props.snapshot} mutating={props.mutating} runMutation={props.runMutation} /> : <EmptyState title="顧客を選択してください" text="左の一覧から顧客を選ぶと、カルテと予約履歴を確認できます。" />}</section></div></>;
}

function CustomerDetail({ customer, snapshot, mutating, runMutation }: { customer: AdminCustomer; snapshot: AdminSnapshot; mutating: boolean; runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const reservations = snapshot.reservations.filter((item) => item.customerId === customer.id).sort((a, b) => b.startTime.localeCompare(a.startTime));
  const entries = snapshot.karteEntries.filter((item) => item.customerId === customer.id);
  const [noteDraft, setNoteDraft] = useState({
    customerId: customer.id,
    value: customer.sharedNote,
  });
  const note = noteDraft.customerId === customer.id
    ? noteDraft.value
    : customer.sharedNote;
  const setNote = (value: string) => setNoteDraft({ customerId: customer.id, value });
  const [showForm, setShowForm] = useState(false);
  return <><div className="admin-customer-profile"><div><p className="eyebrow">CUSTOMER PROFILE</p><h2>{customer.displayName}</h2><span>{customer.telephoneNumber || "電話番号未登録"}</span></div><dl><div><dt>生年月日</dt><dd>{customer.dateOfBirth || "未登録"}</dd></div><div><dt>性別</dt><dd>{customer.gender || "未登録"}</dd></div></dl></div><label className="admin-note-field"><span>顧客共通メモ</span><textarea onChange={(event) => setNote(event.target.value)} placeholder="アレルギー、好み、注意事項など" rows={4} value={note} /></label><button className="admin-outline-button" disabled={mutating || note === customer.sharedNote} onClick={() => void runMutation({ action: "karte.note", customerId: customer.id, note }, "顧客共通メモを保存しました。")}>共通メモを保存</button><div className="admin-subsection-heading"><h3>施術カルテ</h3><button onClick={() => setShowForm((current) => !current)}>{showForm ? "閉じる" : "+ カルテを登録"}</button></div>{showForm ? <KarteForm customer={customer} mutating={mutating} reservations={reservations} runMutation={runMutation} onSaved={() => setShowForm(false)} /> : null}<div className="admin-karte-timeline">{entries.map((entry) => <article key={entry.id}><time>{formatDate(entry.treatmentAt)}</time><div><strong>{entry.menuName || "施術メニュー未設定"}</strong><p>{entry.treatmentNote}</p>{entry.colorFormulaNote ? <small>薬剤：{entry.colorFormulaNote}</small> : null}{entry.nextVisitNote ? <small>次回：{entry.nextVisitNote}</small> : null}</div></article>)}{entries.length === 0 ? <p>カルテはまだ登録されていません。</p> : null}</div><div className="admin-subsection-heading"><h3>予約・来店履歴</h3></div><div className="admin-history-list">{reservations.map((reservation) => <article key={reservation.sourcePath}><time>{formatDateTime(reservation.startTime)}</time><div><strong>{reservation.treatmentDetail}</strong><span>{yen(reservation.price)}</span></div><span className={`admin-status status-${reservation.status}`}>{statusLabel(reservation.status)}</span></article>)}</div></>;
}

function KarteForm({ customer, reservations, mutating, runMutation, onSaved }: { customer: AdminCustomer; reservations: AdminReservation[]; mutating: boolean; runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean>; onSaved: () => void }) {
  const [reservationId, setReservationId] = useState("");
  const [menuName, setMenuName] = useState("");
  const [treatmentAt, setTreatmentAt] = useState(toDateInput(new Date()));
  const [treatmentNote, setTreatmentNote] = useState("");
  const [colorFormulaNote, setColorFormulaNote] = useState("");
  const [nextVisitNote, setNextVisitNote] = useState("");

  function selectReservation(nextReservationId: string) {
    const linked = reservations.find((item) => item.id === nextReservationId);
    setReservationId(nextReservationId);
    if (linked) {
      setMenuName(linked.treatmentDetail);
      setTreatmentAt(toDateInput(new Date(linked.startTime)));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await runMutation({
      action: "karte.save",
      entry: {
        id: "",
        customerId: customer.id,
        reservationId: reservationId || null,
        treatmentAt: new Date(`${treatmentAt}T12:00:00`).toISOString(),
        menuName,
        treatmentNote,
        colorFormulaNote,
        nextVisitNote,
      },
    }, "施術カルテを登録しました。");
    if (ok) onSaved();
  }

  return (
    <form className="admin-karte-form" onSubmit={submit}>
      <label>施術日<input required type="date" value={treatmentAt} onChange={(event) => setTreatmentAt(event.target.value)} /></label>
      <label>関連予約<select value={reservationId} onChange={(event) => selectReservation(event.target.value)}><option value="">関連予約なし</option>{reservations.map((item) => <option key={item.sourcePath} value={item.id}>{formatDateTime(item.startTime)} {item.treatmentDetail}</option>)}</select></label>
      <label>メニュー<input value={menuName} onChange={(event) => setMenuName(event.target.value)} /></label>
      <label className="is-wide">施術内容・仕上がり<textarea required rows={4} value={treatmentNote} onChange={(event) => setTreatmentNote(event.target.value)} /></label>
      <label>カラー・薬剤メモ<textarea rows={3} value={colorFormulaNote} onChange={(event) => setColorFormulaNote(event.target.value)} /></label>
      <label>次回へのメモ<textarea rows={3} value={nextVisitNote} onChange={(event) => setNextVisitNote(event.target.value)} /></label>
      <button disabled={mutating} type="submit">カルテを保存</button>
    </form>
  );
}

function Menus(props: {
  menuId?: string;
  snapshot: AdminSnapshot;
  mutating: boolean;
  runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean>;
}) {
  if (props.menuId !== undefined) {
    const menu = props.menuId === "new"
      ? emptyMenu()
      : props.snapshot.menus.find((item) => item.id === props.menuId);
    if (!menu) {
      return <><PageTitle eyebrow="MENU EDITOR" title="メニューが見つかりません" description="削除されたか、URLが正しくない可能性があります。" /><Link className="admin-back-link" href="/admin/menus">← メニュー一覧へ戻る</Link></>;
    }
    return <MenuEditor menu={menu} mutating={props.mutating} runMutation={props.runMutation} />;
  }

  const coupons = props.snapshot.menus.filter(isCoupon);
  const regularMenus = props.snapshot.menus.filter((menu) => !isCoupon(menu));

  return (
    <>
      <PageTitle eyebrow="MENU MANAGEMENT" title="メニュー管理" description="メニューを選択して、内容や画像を編集できます。" />
      <div className="admin-section-action">
        <span>{props.snapshot.menus.length}件のメニュー</span>
        <Link href="/admin/menus?menuId=new">+ 新規メニュー</Link>
      </div>
      <div className="admin-menu-groups">
        <AdminMenuSection
          emptyMessage="登録済みのクーポンはありません。"
          menus={coupons}
          mutating={props.mutating}
          title="クーポン"
          runMutation={props.runMutation}
        />
        <AdminMenuSection
          emptyMessage="登録済みの通常メニューはありません。"
          menus={regularMenus}
          mutating={props.mutating}
          title="通常メニュー"
          runMutation={props.runMutation}
        />
      </div>
    </>
  );
}

function AdminMenuSection({
  emptyMessage,
  menus,
  mutating,
  title,
  runMutation,
}: {
  emptyMessage: string;
  menus: AdminMenu[];
  mutating: boolean;
  title: string;
  runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean>;
}) {
  return (
    <section className="admin-menu-group" aria-labelledby={`admin-menu-${title === "クーポン" ? "coupon" : "regular"}-heading`}>
      <h2 id={`admin-menu-${title === "クーポン" ? "coupon" : "regular"}-heading`}>{title}<span>{menus.length}件</span></h2>
      <div className="admin-menu-table">
        <div className="admin-table-head"><span>画像</span><span>メニュー</span><span>所要時間</span><span>料金</span><span>予約</span><span /></div>
        {menus.map((menu) => (
          <article key={menu.id}>
            <Link aria-label={`${menu.treatmentDetail}を編集`} className="admin-menu-row-link" href={`/admin/menus?menuId=${encodeURIComponent(menu.id)}`}>
              <MenuThumbnail menu={menu} />
              <div><strong>{menu.treatmentDetail}</strong><small>{menu.menuIntroduction || "説明未設定"}</small></div>
              <span>{menu.treatmentTimeMinutes}分</span>
              <span>{yen(menu.afterPrice)}{menu.isNeedExtraMoney ? "〜" : ""}</span>
              <span>{menu.isCallable ? "電話予約" : "Web予約可"}</span>
              <b aria-hidden="true">›</b>
            </Link>
            <button className="is-danger" disabled={mutating} onClick={() => { if (confirm(`${menu.treatmentDetail}を削除しますか？`)) void runMutation({ action: "menu.delete", id: menu.id }, "メニューを削除しました。"); }}>削除</button>
          </article>
        ))}
        {menus.length === 0 ? <p className="admin-menu-empty">{emptyMessage}</p> : null}
      </div>
    </section>
  );
}

function MenuThumbnail({ menu }: { menu: AdminMenu }) {
  return <div className={`admin-menu-thumbnail${menu.menuImageUrl ? " has-image" : ""}`}>{menu.menuImageUrl ? <Image alt="" fill sizes="(max-width: 760px) 88px, 72px" src={menu.menuImageUrl} /> : <VishuIcon name="spa" />}</div>;
}

function MenuEditor({ menu, mutating, runMutation }: { menu: AdminMenu; mutating: boolean; runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const router = useRouter();
  const [draft, setDraft] = useState(menu);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    canonicalCategoryIds(menu.treatmentDetailList),
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(menu.menuImageUrl);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isCoupon, setIsCoupon] = useState(menu.beforePrice !== null);
  const update = <K extends keyof AdminMenu>(key: K, value: AdminMenu[K]) => setDraft((current) => ({ ...current, [key]: value }));

  useEffect(() => () => {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectImage(file: File | undefined) {
    setFormError("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError("画像は5MB以下にしてください。");
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setPreviewUrl("");
    setDraft((current) => ({ ...current, menuImagePath: "", menuImageUrl: "" }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    let menuToSave = {
      ...draft,
      treatmentDetailList: selectedCategoryIds,
    };
    try {
      if (imageFile) {
        setUploading(true);
        const uploadedImage = await uploadAdminMenuImage(imageFile);
        menuToSave = { ...menuToSave, ...uploadedImage };
      }
      const ok = await runMutation({ action: "menu.save", menu: menuToSave }, "メニューを保存しました。");
      if (ok) router.push("/admin/menus");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "画像をアップロードできませんでした。");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="admin-menu-editor-page">
      <Link className="admin-back-link" href="/admin/menus">← メニュー一覧へ戻る</Link>
      <PageTitle eyebrow="MENU EDITOR" title={draft.id ? "メニュー編集" : "新規メニュー"} description="お客様に表示する内容と画像を設定します。" />
      <form className="admin-menu-editor" onSubmit={submit}>
        {formError ? <div className="admin-alert is-error" role="alert">{formError}</div> : null}
        <section className="admin-panel admin-menu-image-editor">
          <div className={`admin-menu-image-preview${previewUrl ? " has-image" : ""}`}>
            {previewUrl ? <Image alt="メニュー画像のプレビュー" fill sizes="(max-width: 760px) calc(100vw - 30px), 340px" src={previewUrl} unoptimized={previewUrl.startsWith("blob:")} /> : <><VishuIcon name="spa" /><span>画像未設定</span></>}
          </div>
          <div>
            <h2>メニュー画像</h2>
            <p>JPEG・PNG・WebP、5MB以下。予約画面とメニュー一覧に表示されます。</p>
            <label className="admin-image-picker">画像を選択<input accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} type="file" /></label>
            {previewUrl ? <button className="admin-image-remove" onClick={removeImage} type="button">画像を削除</button> : null}
          </div>
        </section>
        <section className="admin-panel admin-menu-fields">
          <label>メニュー名<input required value={draft.treatmentDetail} onChange={(event) => update("treatmentDetail", event.target.value)} /></label>
          <label>紹介文<textarea rows={3} value={draft.menuIntroduction} onChange={(event) => update("menuIntroduction", event.target.value)} /></label>
          <fieldset className="admin-menu-categories">
            <legend>施術カテゴリ（複数選択可）</legend>
            <div>
              {menuCategories.filter((category) => !category.isOther).map((category) => (
                <label key={category.id}>
                  <input
                    checked={selectedCategoryIds.includes(category.id)}
                    type="checkbox"
                    onChange={() => setSelectedCategoryIds((current) => toggleCategory(current, category.id))}
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="admin-checkbox"><input checked={isCoupon} type="checkbox" onChange={(event) => { const checked = event.target.checked; setIsCoupon(checked); update("beforePrice", checked ? draft.beforePrice ?? draft.afterPrice : null); }} />クーポンとして表示</label>
          <div>{isCoupon ? <label>値引き前の通常価格<input min="1" required type="number" value={draft.beforePrice ?? ""} onChange={(event) => update("beforePrice", Number(event.target.value))} /></label> : null}<label>{isCoupon ? "クーポン価格" : "通常価格"}<input min="1" required type="number" value={draft.afterPrice} onChange={(event) => update("afterPrice", Number(event.target.value))} /></label></div>
          <div><label>所要時間（分）<input min="1" required type="number" value={draft.treatmentTimeMinutes} onChange={(event) => update("treatmentTimeMinutes", Number(event.target.value))} /></label><label>表示順<input min="0" required type="number" value={draft.priority} onChange={(event) => update("priority", Number(event.target.value))} /></label></div>
          <label className="admin-checkbox"><input checked={draft.isCallable} type="checkbox" onChange={(event) => update("isCallable", event.target.checked)} />電話予約のみ</label>
          <label className="admin-checkbox"><input checked={draft.isNeedExtraMoney} type="checkbox" onChange={(event) => update("isNeedExtraMoney", event.target.checked)} />追加料金あり（価格に「〜」を表示）</label>
        </section>
        <div className="admin-menu-editor-actions"><Link href="/admin/menus">キャンセル</Link><button disabled={mutating || uploading} type="submit">{uploading ? "画像をアップロード中…" : mutating ? "保存中…" : "保存する"}</button></div>
      </form>
    </div>
  );
}

function Notifications({ snapshot, mutating, runMutation }: {
  snapshot: AdminSnapshot;
  mutating: boolean;
  runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean>;
}) {
  const [channel, setChannel] = useState<"push" | "email">("push");
  const [target, setTarget] = useState<"all" | "customer">("all");
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const selectedCustomer = snapshot.customers.find((customer) => customer.id === customerId);
  const recipientCount = target === "all"
    ? channel === "push" ? snapshot.notificationDeviceCount : snapshot.notificationEmailCount
    : channel === "push" ? selectedCustomer?.pushTokenCount ?? 0 : selectedCustomer?.email ? 1 : 0;
  const recipientUnit = channel === "push" ? "台" : "件";
  const channelLabel = channel === "push" ? "Push通知" : "メール";
  const history = channel === "push" ? snapshot.pushNotifications : snapshot.emailNotifications;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const audience = target === "all" ? "全ユーザー" : selectedCustomer?.displayName;
    if (!audience || !confirm(`${audience}（送信先 ${recipientCount}${recipientUnit}）へ${channelLabel}を送信しますか？`)) return;
    const ok = await runMutation({
      action: "notification.send",
      channel,
      target,
      customerId: target === "customer" ? customerId : "",
      title,
      content,
    }, `${audience}への${channelLabel}送信を受け付けました。`);
    if (ok) {
      setTitle("");
      setContent("");
    }
  }

  return (
    <>
      <PageTitle eyebrow="CUSTOMER MESSAGING" title="お知らせ配信" description="送信方法を選び、全ユーザーまたは特定のユーザーへお知らせを配信します。" />
      <div className="admin-notification-layout">
        <form className="admin-panel admin-notification-form" onSubmit={submit}>
          <header className="admin-notification-compose-header">
            <div className="admin-notification-compose-title">
              <span><VishuIcon name={channel === "push" ? "bell" : "mail"} /></span>
              <div>
                <small>{channelLabel}を作成中</small>
                <strong>{target === "all" ? "全ユーザー" : selectedCustomer?.displayName || "送信先を選択"}</strong>
                <p>送信先 {recipientCount}{recipientUnit}</p>
              </div>
            </div>
            <button className="admin-notification-primary-submit" disabled={mutating || recipientCount === 0} type="submit">
              <VishuIcon name={channel === "push" ? "bell" : "mail"} />
              <span>{mutating ? "送信処理中…" : `${channelLabel}を送信`}</span>
            </button>
          </header>
          <fieldset>
            <legend>送信方法</legend>
            <div className="admin-notification-targets">
              <label className={channel === "push" ? "is-active" : ""}>
                <input checked={channel === "push"} name="notification-channel" onChange={() => setChannel("push")} type="radio" />
                <VishuIcon name="bell" />
                <span><strong>Push通知</strong><small>iOS・Androidアプリへ配信</small></span>
              </label>
              <label className={channel === "email" ? "is-active" : ""}>
                <input checked={channel === "email"} name="notification-channel" onChange={() => setChannel("email")} type="radio" />
                <VishuIcon name="mail" />
                <span><strong>メール</strong><small>登録メールアドレスへ配信</small></span>
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>通知先</legend>
            <div className="admin-notification-targets">
              <label className={target === "all" ? "is-active" : ""}>
                <input checked={target === "all"} name="notification-target" onChange={() => setTarget("all")} type="radio" />
                <VishuIcon name="person" />
                <span><strong>全ユーザー</strong><small>{channel === "push" ? "通知許可済みの登録端末すべて" : "メール登録済みのユーザーすべて"}</small></span>
              </label>
              <label className={target === "customer" ? "is-active" : ""}>
                <input checked={target === "customer"} name="notification-target" onChange={() => setTarget("customer")} type="radio" />
                <VishuIcon name="person" />
                <span><strong>特定ユーザー</strong><small>選択した1名へ送信</small></span>
              </label>
            </div>
          </fieldset>
          {target === "customer" ? (
            <label className="admin-notification-field">
              <span>ユーザー</span>
              <select required value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">ユーザーを選択してください</option>
                {snapshot.customers.map((customer) => (
                  <option disabled={channel === "push" ? customer.pushTokenCount === 0 : !customer.email} key={customer.id} value={customer.id}>
                    {customer.displayName}（{channel === "push" ? customer.pushTokenCount > 0 ? `登録端末 ${customer.pushTokenCount}台` : "通知端末なし" : customer.email || "メール未登録"}）
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="admin-notification-field">
            <span>タイトル <small>{title.length}/100</small></span>
            <input maxLength={100} placeholder="例：Salon Vishuからのお知らせ" required value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="admin-notification-field">
            <span>通知内容 <small>{content.length}/1000</small></span>
            <textarea maxLength={1000} placeholder="お客様へお知らせする内容を入力してください。" required rows={8} value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
          <div className="admin-notification-summary">
            <VishuIcon name={channel === "push" ? "bell" : "mail"} />
            <div>
              <small>送信対象</small>
              <strong>{target === "all" ? "全ユーザー" : selectedCustomer?.displayName || "未選択"}</strong>
              <span>{channel === "push" ? "登録端末" : "メールアドレス"} {recipientCount}{recipientUnit}</span>
            </div>
          </div>
          <button className="admin-notification-submit" disabled={mutating || recipientCount === 0} type="submit">
            <VishuIcon name={channel === "push" ? "bell" : "mail"} />
            <span>{mutating ? "送信処理中…" : `${channelLabel}を確認して送信`}</span>
          </button>
          <p className="admin-notification-help">{channel === "push" ? "通知を許可している端末に配信されます。端末の通信状況などにより、到着まで時間がかかる場合があります。" : "Firebase Authenticationに登録されたメールアドレスへ、ユーザーごとに個別送信されます。"}</p>
        </form>
        <section className="admin-panel admin-notification-history">
          <SectionHeading eyebrow="HISTORY" title="送信履歴" />
          {history.map((notification) => (
            <article key={notification.id}>
              <div>
                <span>{notification.targetLabel}</span>
                <time>{notification.createdAt ? formatDateTime(notification.createdAt) : "日時不明"}</time>
              </div>
              <strong>{notification.title}</strong>
              <p>{notification.content}</p>
              <small>送信対象 {"recipientDeviceCount" in notification ? `${notification.recipientDeviceCount}台` : `${notification.recipientEmailCount}件 · ${notification.status === "sent" ? "送信済み" : notification.status === "failed" ? "送信失敗" : "処理中"}`}</small>
            </article>
          ))}
          {history.length === 0 ? <p className="admin-notification-empty">送信履歴はありません。</p> : null}
        </section>
      </div>
    </>
  );
}

function AdminLoading() { return <main className="auth-loading-page" aria-busy="true"><Brand owner /><div className="auth-loading-content"><div className="login-icon"><VishuIcon name="lock" /></div><p>管理データを安全に読み込んでいます…</p></div></main>; }
function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="admin-console-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>; }
function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="admin-section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>; }
function Metric({ icon, label, value, compact = false }: { icon: "calendar" | "clock" | "sparkle"; label: string; value: string; compact?: boolean }) { return <article><span><VishuIcon name={icon} /></span><div><small>{label}</small><strong className={compact ? "is-compact" : ""}>{value}</strong></div></article>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="admin-empty-state"><VishuIcon name="leaf" /><h2>{title}</h2><p>{text}</p></div>; }
function emptyMenu(): AdminMenu { return { id: "", treatmentDetail: "", menuIntroduction: "", treatmentDetailList: [], menuImageUrl: "", menuImagePath: "", treatmentTimeMinutes: 60, beforePrice: null, afterPrice: 0, isCallable: false, isNeedExtraMoney: false, priority: 999, updatedAt: null }; }
function customerSummary(customer: AdminCustomer, reservations: AdminReservation[], entries: AdminSnapshot["karteEntries"]) { const customerReservations = reservations.filter((item) => item.customerId === customer.id); const visits = customerReservations.filter((item) => item.status === "visited"); const lastVisit = visits.sort((a, b) => b.startTime.localeCompare(a.startTime))[0]?.startTime; const entryIds = new Set(entries.filter((item) => item.customerId === customer.id).map((item) => item.reservationId)); return { visits: visits.length, lastVisit, missingKarte: visits.some((item) => !entryIds.has(item.id)) }; }
function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function addDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function weekDays(anchor: Date) { const day = anchor.getDay(); const monday = addDays(startOfDay(anchor), day === 0 ? -6 : 1 - day); return Array.from({ length: 7 }, (_, index) => addDays(monday, index)); }
function monthCalendarDays(anchor: Date) { const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const start = weekDays(first)[0]; return Array.from({ length: 42 }, (_, index) => addDays(start, index)); }
function dayKey(date: Date) { return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; }
function monthKey(date: Date) { return `${date.getFullYear()}-${date.getMonth() + 1}`; }
function weekday(date: Date) { return new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date); }
function formatDate(value: string) { return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)); }
function previousVisitText(reservation: AdminReservation) { return reservation.previousVisitAt ? `前回来店：${formatDate(reservation.previousVisitAt)}` : "初回来店"; }
function formatTime(value: string) { return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function weekLabel(anchor: Date) { const days = weekDays(anchor); return `${days[0].getFullYear()}/${days[0].getMonth() + 1}/${days[0].getDate()} – ${days[6].getMonth() + 1}/${days[6].getDate()}`; }
function monthLabel(anchor: Date) { return `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`; }
function minutesLabel(minutes: number) { return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }
function statusLabel(status: ReservationStatus) { return { confirmed: "予約済み", visited: "来店済み", canceled: "キャンセル" }[status]; }
function yen(value: number) { return `¥${value.toLocaleString("ja-JP")}`; }
function toDateInput(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dateFromInput(value: string) { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return null; const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])); return toDateInput(date) === value ? date : null; }
