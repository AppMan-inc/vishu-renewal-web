"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Brand, VishuIcon } from "@/components/vishu-ui";
import { AdminApiError, fetchAdminSnapshot, mutateAdmin } from "@/features/admin/admin-api";
import type {
  AdminCustomer,
  AdminMenu,
  AdminReservation,
  AdminSection,
  AdminSnapshot,
  ReservationStatus,
} from "@/features/admin/types";
import { firebaseAuth } from "@/lib/firebase/client";

const navigation: Array<{ section: AdminSection; href: string; label: string; icon: "calendar" | "clock" | "person" | "spa" | "sparkle" }> = [
  { section: "dashboard", href: "/admin", label: "ホーム", icon: "sparkle" },
  { section: "reservations", href: "/admin/reservations", label: "予約", icon: "calendar" },
  { section: "rests", href: "/admin/rests", label: "休憩", icon: "clock" },
  { section: "customers", href: "/admin/customers", label: "顧客・カルテ", icon: "person" },
  { section: "menus", href: "/admin/menus", label: "メニュー", icon: "spa" },
  { section: "sales", href: "/admin/sales", label: "売上", icon: "sparkle" },
];

export function AdminConsole({ section }: { section: AdminSection }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mutating, setMutating] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      setSnapshot(await fetchAdminSnapshot());
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 401) {
        router.replace(`/admin/login?returnTo=${encodeURIComponent(location.pathname)}`);
        return;
      }
      setError(caught instanceof Error ? caught.message : "管理データを取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), (user) => {
      if (!user) {
        router.replace(`/admin/login?returnTo=${encodeURIComponent(location.pathname)}`);
        return;
      }
      void refresh();
    });
  }, [refresh, router]);

  async function runMutation(body: Record<string, unknown>, successMessage: string) {
    setMutating(true);
    setError("");
    setNotice("");
    try {
      await mutateAdmin(body);
      await refresh();
      setNotice(successMessage);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新に失敗しました。");
      return false;
    } finally {
      setMutating(false);
    }
  }

  async function handleSignOut() {
    await signOut(firebaseAuth());
    router.replace("/admin/login");
  }

  if (loading) return <AdminLoading />;

  return (
    <main className="admin-console-page">
      <header className="admin-console-header">
        <Brand owner />
        <div>
          {snapshot ? <span>{snapshot.session.email || "Salon owner"}</span> : null}
          <button onClick={() => void refresh()} type="button">再読込</button>
          <button onClick={() => void handleSignOut()} type="button">ログアウト</button>
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
            <AdminSectionContent
              mutating={mutating}
              runMutation={runMutation}
              section={section}
              snapshot={snapshot}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function AdminSectionContent(props: {
  section: AdminSection;
  snapshot: AdminSnapshot;
  mutating: boolean;
  runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean>;
}) {
  switch (props.section) {
    case "dashboard": return <Dashboard snapshot={props.snapshot} />;
    case "reservations": return <Reservations snapshot={props.snapshot} runMutation={props.runMutation} mutating={props.mutating} />;
    case "rests": return <Rests snapshot={props.snapshot} runMutation={props.runMutation} mutating={props.mutating} />;
    case "customers": return <Customers snapshot={props.snapshot} runMutation={props.runMutation} mutating={props.mutating} />;
    case "menus": return <Menus snapshot={props.snapshot} runMutation={props.runMutation} mutating={props.mutating} />;
    case "sales": return <Sales snapshot={props.snapshot} />;
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
      sales: "予約件数と売上見込を集計",
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
    const ok = await props.runMutation({ action: "reservation.status", sourcePath: selected.sourcePath, status: nextStatus }, "予約ステータスを更新しました。");
    if (ok) setSelected(null);
  }

  return (
    <>
      <PageTitle eyebrow="RESERVATIONS" title="予約カレンダー" description="予約と休憩を同じカレンダーで確認できます。" />
      <div className="admin-toolbar">
        <div className="admin-segmented"><button className={view === "week" ? "is-active" : ""} onClick={() => setView("week")}>週</button><button className={view === "month" ? "is-active" : ""} onClick={() => setView("month")}>月</button></div>
        <div className="admin-period-controls"><button onClick={() => move(-1)}>‹</button><button onClick={() => setAnchor(startOfDay(new Date()))}>今日</button><button onClick={() => move(1)}>›</button><strong>{view === "week" ? weekLabel(anchor) : monthLabel(anchor)}</strong></div>
        <select aria-label="ステータス" onChange={(event) => setStatus(event.target.value as typeof status)} value={status}><option value="active">キャンセル以外</option><option value="all">すべて</option><option value="confirmed">予約済み</option><option value="visited">来店済み</option><option value="canceled">キャンセル</option></select>
      </div>
      {view === "week" ? (
        <div className="admin-week-grid">
          {days.map((day) => {
            const reservations = visible.filter((item) => dayKey(new Date(item.startTime)) === dayKey(day));
            const rests = props.snapshot.restBlocks.filter((item) => dayKey(new Date(item.startTime)) === dayKey(day));
            return <section className={dayKey(day) === dayKey(new Date()) ? "is-today" : ""} key={day.toISOString()}><header><span>{weekday(day)}</span><strong>{day.getDate()}</strong></header><div>{[...reservations.map((item) => ({ type: "reservation" as const, start: item.startTime, item })), ...rests.map((item) => ({ type: "rest" as const, start: item.startTime, item }))].sort((a, b) => a.start.localeCompare(b.start)).map((event) => event.type === "reservation" ? <button className={`admin-calendar-event status-${event.item.status}`} key={event.item.sourcePath} onClick={() => setSelected(event.item)}><time>{formatTime(event.item.startTime)}</time><strong>{event.item.customerName}</strong><span>{event.item.treatmentDetail}</span></button> : <div className="admin-calendar-event is-rest" key={event.item.id}><time>{formatTime(event.item.startTime)}–{formatTime(event.item.endTime)}</time><strong>休憩</strong></div>)}{reservations.length === 0 && rests.length === 0 ? <p className="admin-calendar-empty">予定なし</p> : null}</div></section>;
          })}
        </div>
      ) : (
        <div className="admin-month-grid">
          {days.map((day) => {
            const dayReservations = visible.filter((item) => dayKey(new Date(item.startTime)) === dayKey(day));
            const restCount = props.snapshot.restBlocks.filter((item) => dayKey(new Date(item.startTime)) === dayKey(day)).length;
            return <section className={`${day.getMonth() !== anchor.getMonth() ? "is-outside" : ""} ${dayKey(day) === dayKey(new Date()) ? "is-today" : ""}`} key={day.toISOString()}><header>{day.getDate()}</header>{dayReservations.slice(0, 3).map((item) => <button key={item.sourcePath} onClick={() => setSelected(item)}><time>{formatTime(item.startTime)}</time> {item.customerName}</button>)}{dayReservations.length > 3 ? <small>ほか{dayReservations.length - 3}件</small> : null}{restCount ? <small>休憩 {restCount}件</small> : null}</section>;
          })}
        </div>
      )}
      {selected ? <ReservationDetail reservation={selected} mutating={props.mutating} onClose={() => setSelected(null)} onStatus={updateStatus} /> : null}
    </>
  );
}

function ReservationDetail({ reservation, mutating, onClose, onStatus }: { reservation: AdminReservation; mutating: boolean; onClose: () => void; onStatus: (status: ReservationStatus) => void }) {
  return <div className="admin-detail-overlay" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="admin-detail-panel"><button className="admin-detail-close" onClick={onClose}>×</button><p className="eyebrow">RESERVATION DETAIL</p><h2>{reservation.customerName}</h2><span className={`admin-status status-${reservation.status}`}>{statusLabel(reservation.status)}</span><dl><div><dt>日時</dt><dd>{formatDateTime(reservation.startTime)} – {formatTime(reservation.finishTime)}</dd></div><div><dt>メニュー</dt><dd>{reservation.treatmentDetail}</dd></div><div><dt>料金</dt><dd>{yen(reservation.price)}</dd></div><div><dt>電話番号</dt><dd>{reservation.telephoneNumber || "未登録"}</dd></div><div><dt>ご希望</dt><dd>{reservation.customerHope || "なし"}</dd></div></dl><div className="admin-detail-actions"><button disabled={mutating || reservation.status === "visited"} onClick={() => void onStatus("visited")}>来店済みにする</button><button disabled={mutating || reservation.status === "confirmed"} onClick={() => void onStatus("confirmed")}>予約済みに戻す</button><button className="is-danger" disabled={mutating || reservation.status === "canceled"} onClick={() => void onStatus("canceled")}>キャンセル</button></div>{reservation.customerId ? <Link className="admin-primary-link" href={`/admin/customers?customer=${encodeURIComponent(reservation.customerId)}`}>顧客・カルテを開く →</Link> : null}</aside></div>;
}

function Rests(props: { snapshot: AdminSnapshot; mutating: boolean; runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const [duration, setDuration] = useState(60);
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const days = Array.from({ length: 7 }, (_, index) => addDays(startOfDay(new Date()), index));
  const slots = Array.from({ length: 18 }, (_, index) => 9 * 60 + index * 30);
  const isBlocked = (start: Date) => {
    const end = new Date(start.getTime() + duration * 60_000);
    return end.getHours() > 18 || (end.getHours() === 18 && end.getMinutes() > 0) || [...props.snapshot.reservations.filter((item) => item.status !== "canceled").map((item) => [new Date(item.startTime), new Date(item.finishTime)]), ...props.snapshot.restBlocks.map((item) => [new Date(item.startTime), new Date(item.endTime)])].some(([blockedStart, blockedEnd]) => start < blockedEnd && blockedStart < end);
  };
  async function createRest() {
    if (!selectedStart) return;
    const end = new Date(selectedStart.getTime() + duration * 60_000);
    const ok = await props.runMutation({ action: "rest.create", startTime: selectedStart.toISOString(), endTime: end.toISOString() }, "休憩を登録しました。");
    if (ok) setSelectedStart(null);
  }
  return <><PageTitle eyebrow="AVAILABILITY" title="休憩登録" description="予約と重ならない時間枠を選んで登録します。" /><div className="admin-rest-layout"><section className="admin-panel"><div className="admin-duration-selector"><span>休憩時間</span>{[30, 60, 90, 120].map((minutes) => <button className={duration === minutes ? "is-active" : ""} key={minutes} onClick={() => { setDuration(minutes); setSelectedStart(null); }}>{minutes}分</button>)}</div><div className="admin-slot-grid"><div /><>{days.map((day) => <header key={day.toISOString()}><span>{weekday(day)}</span><strong>{day.getDate()}</strong></header>)}</>{slots.map((minutes) => <div className="admin-slot-row" key={minutes}><time>{minutesLabel(minutes)}</time>{days.map((day) => { const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60); const blocked = isBlocked(start) || start < new Date(); const selected = selectedStart?.getTime() === start.getTime(); return <button aria-label={`${formatDateTime(start.toISOString())} ${blocked ? "選択不可" : "選択"}`} className={selected ? "is-selected" : ""} disabled={blocked} key={day.toISOString()} onClick={() => setSelectedStart(start)}>{blocked ? "×" : selected ? "●" : "○"}</button>; })}</div>)}</div>{selectedStart ? <div className="admin-selection-confirm"><div><small>選択した休憩</small><strong>{formatDateTime(selectedStart.toISOString())} – {formatTime(new Date(selectedStart.getTime() + duration * 60_000).toISOString())}</strong></div><button disabled={props.mutating} onClick={() => void createRest()}>この時間で登録</button></div> : null}</section><section className="admin-panel admin-rest-list"><SectionHeading eyebrow="REGISTERED" title="登録済みの休憩" />{props.snapshot.restBlocks.filter((item) => new Date(item.endTime) >= startOfDay(new Date())).slice(0, 30).map((item) => <article key={item.id}><div><strong>{formatDateTime(item.startTime)}</strong><span>{formatTime(item.startTime)} – {formatTime(item.endTime)}</span></div><button disabled={props.mutating} onClick={() => { if (confirm("この休憩を削除しますか？")) void props.runMutation({ action: "rest.delete", id: item.id }, "休憩を削除しました。"); }}>削除</button></article>)}{props.snapshot.restBlocks.length === 0 ? <p>登録済みの休憩はありません。</p> : null}</section></div></>;
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

function Menus(props: { snapshot: AdminSnapshot; mutating: boolean; runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState<AdminMenu | null>(null);
  return <><PageTitle eyebrow="MENU MANAGEMENT" title="メニュー管理" description="料金、所要時間、予約方法、表示順を編集します。" /><div className="admin-section-action"><span>{props.snapshot.menus.length}件のメニュー</span><button onClick={() => setEditing(emptyMenu())}>+ 新規メニュー</button></div><div className="admin-menu-table"><div className="admin-table-head"><span>メニュー</span><span>所要時間</span><span>料金</span><span>予約</span><span /></div>{props.snapshot.menus.map((menu) => <article key={menu.id}><div><strong>{menu.treatmentDetail}</strong><small>{menu.menuIntroduction || "説明未設定"}</small></div><span>{menu.treatmentTimeMinutes}分</span><span>{yen(menu.afterPrice)}{menu.isNeedExtraMoney ? "〜" : ""}</span><span>{menu.isCallable ? "電話予約" : "Web予約可"}</span><div><button onClick={() => setEditing(menu)}>編集</button><button className="is-danger" disabled={props.mutating} onClick={() => { if (confirm(`${menu.treatmentDetail}を削除しますか？`)) void props.runMutation({ action: "menu.delete", id: menu.id }, "メニューを削除しました。"); }}>削除</button></div></article>)}</div>{editing ? <MenuEditor menu={editing} mutating={props.mutating} onClose={() => setEditing(null)} runMutation={props.runMutation} /> : null}</>;
}

function MenuEditor({ menu, mutating, onClose, runMutation }: { menu: AdminMenu; mutating: boolean; onClose: () => void; runMutation: (body: Record<string, unknown>, message: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState(menu);
  const [details, setDetails] = useState(menu.treatmentDetailList.join("\n"));
  const update = <K extends keyof AdminMenu>(key: K, value: AdminMenu[K]) => setDraft((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) { event.preventDefault(); const ok = await runMutation({ action: "menu.save", menu: { ...draft, treatmentDetailList: details.split("\n").map((item) => item.trim()).filter(Boolean) } }, "メニューを保存しました。"); if (ok) onClose(); }
  return <div className="admin-detail-overlay"><aside className="admin-detail-panel admin-menu-editor"><button className="admin-detail-close" onClick={onClose}>×</button><p className="eyebrow">MENU EDITOR</p><h2>{draft.id ? "メニュー編集" : "新規メニュー"}</h2><form onSubmit={submit}><label>メニュー名<input required value={draft.treatmentDetail} onChange={(event) => update("treatmentDetail", event.target.value)} /></label><label>紹介文<textarea rows={3} value={draft.menuIntroduction} onChange={(event) => update("menuIntroduction", event.target.value)} /></label><label>施術内容（1行1項目）<textarea rows={4} value={details} onChange={(event) => setDetails(event.target.value)} /></label><div><label>通常価格<input min="0" type="number" value={draft.beforePrice} onChange={(event) => update("beforePrice", Number(event.target.value))} /></label><label>販売価格<input min="0" required type="number" value={draft.afterPrice} onChange={(event) => update("afterPrice", Number(event.target.value))} /></label></div><div><label>所要時間（分）<input min="1" required type="number" value={draft.treatmentTimeMinutes} onChange={(event) => update("treatmentTimeMinutes", Number(event.target.value))} /></label><label>表示順<input min="0" required type="number" value={draft.priority} onChange={(event) => update("priority", Number(event.target.value))} /></label></div><label className="admin-checkbox"><input checked={draft.isCallable} type="checkbox" onChange={(event) => update("isCallable", event.target.checked)} />電話予約のみ</label><label className="admin-checkbox"><input checked={draft.isNeedExtraMoney} type="checkbox" onChange={(event) => update("isNeedExtraMoney", event.target.checked)} />追加料金あり（価格に「〜」を表示）</label><button disabled={mutating} type="submit">保存する</button></form></aside></div>;
}

function Sales({ snapshot }: { snapshot: AdminSnapshot }) {
  const now = new Date();
  const today = snapshot.reservations.filter((item) => dayKey(new Date(item.startTime)) === dayKey(now) && item.status !== "canceled");
  const month = snapshot.reservations.filter((item) => monthKey(new Date(item.startTime)) === monthKey(now) && item.status !== "canceled");
  const ranking = [...month.reduce((map, item) => map.set(item.treatmentDetail, (map.get(item.treatmentDetail) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
  return <><PageTitle eyebrow="SALES SUMMARY" title="売上サマリー" description="予約データから件数と売上見込を自動集計します。" /><div className="admin-console-stats is-four"><Metric icon="calendar" label="本日の予約" value={`${today.length}件`} /><Metric icon="sparkle" label="本日の売上見込" value={yen(today.reduce((sum, item) => sum + item.price, 0))} compact /><Metric icon="calendar" label="今月の予約" value={`${month.length}件`} /><Metric icon="sparkle" label="今月の売上見込" value={yen(month.reduce((sum, item) => sum + item.price, 0))} compact /></div><div className="admin-sales-grid"><section className="admin-panel"><SectionHeading eyebrow="RANKING" title="今月の人気メニュー" />{ranking.slice(0, 8).map(([name, count], index) => <article key={name}><strong>{index + 1}</strong><span>{name}</span><b>{count}件</b></article>)}{ranking.length === 0 ? <p>集計できる予約はありません。</p> : null}</section><section className="admin-panel"><SectionHeading eyebrow="RECENT" title="直近の予約" />{[...snapshot.reservations].filter((item) => item.status !== "canceled").sort((a, b) => b.startTime.localeCompare(a.startTime)).slice(0, 8).map((item) => <article key={item.sourcePath}><time>{formatDate(item.startTime)}</time><span><strong>{item.customerName}</strong><small>{item.treatmentDetail}</small></span><b>{yen(item.price)}</b></article>)}</section></div></>;
}

function AdminLoading() { return <main className="auth-loading-page" aria-busy="true"><Brand owner /><div className="auth-loading-content"><div className="login-icon"><VishuIcon name="lock" /></div><p>管理データを安全に読み込んでいます…</p></div></main>; }
function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="admin-console-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>; }
function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) { return <div className="admin-section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>; }
function Metric({ icon, label, value, compact = false }: { icon: "calendar" | "clock" | "sparkle"; label: string; value: string; compact?: boolean }) { return <article><span><VishuIcon name={icon} /></span><div><small>{label}</small><strong className={compact ? "is-compact" : ""}>{value}</strong></div></article>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="admin-empty-state"><VishuIcon name="leaf" /><h2>{title}</h2><p>{text}</p></div>; }
function emptyMenu(): AdminMenu { return { id: "", treatmentDetail: "", menuIntroduction: "", treatmentDetailList: [], treatmentTimeMinutes: 60, beforePrice: 0, afterPrice: 0, isCallable: false, isNeedExtraMoney: false, priority: 999, updatedAt: null }; }
function customerSummary(customer: AdminCustomer, reservations: AdminReservation[], entries: AdminSnapshot["karteEntries"]) { const customerReservations = reservations.filter((item) => item.customerId === customer.id); const visits = customerReservations.filter((item) => item.status === "visited"); const lastVisit = visits.sort((a, b) => b.startTime.localeCompare(a.startTime))[0]?.startTime; const entryIds = new Set(entries.filter((item) => item.customerId === customer.id).map((item) => item.reservationId)); return { visits: visits.length, lastVisit, missingKarte: visits.some((item) => !entryIds.has(item.id)) }; }
function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function addDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
function weekDays(anchor: Date) { const day = anchor.getDay(); const monday = addDays(startOfDay(anchor), day === 0 ? -6 : 1 - day); return Array.from({ length: 7 }, (_, index) => addDays(monday, index)); }
function monthCalendarDays(anchor: Date) { const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const start = weekDays(first)[0]; return Array.from({ length: 42 }, (_, index) => addDays(start, index)); }
function dayKey(date: Date) { return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; }
function monthKey(date: Date) { return `${date.getFullYear()}-${date.getMonth() + 1}`; }
function weekday(date: Date) { return new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date); }
function formatDate(value: string) { return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)); }
function formatTime(value: string) { return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function weekLabel(anchor: Date) { const days = weekDays(anchor); return `${days[0].getFullYear()}/${days[0].getMonth() + 1}/${days[0].getDate()} – ${days[6].getMonth() + 1}/${days[6].getDate()}`; }
function monthLabel(anchor: Date) { return `${anchor.getFullYear()}年${anchor.getMonth() + 1}月`; }
function minutesLabel(minutes: number) { return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }
function statusLabel(status: ReservationStatus) { return { confirmed: "予約済み", visited: "来店済み", canceled: "キャンセル" }[status]; }
function yen(value: number) { return `¥${value.toLocaleString("ja-JP")}`; }
function toDateInput(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
