"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AdminClosureApiError,
  createAdminClosures,
  deleteAdminClosures,
  type ClosureConflict,
} from "@/features/admin/admin-closures-api";
import {
  addCalendarDays,
  buildClosurePreview,
  closureBusinessDate,
  closurePeriodLabel,
  groupClosureBlocks,
  minutesLabel,
  tokyoDateKey,
  type ClosureRangeMode,
  type SelectableClosurePeriod,
} from "@/features/admin/closure-registration";
import type {
  AdminBookingSettings,
  AdminRestBlock,
  AdminSnapshot,
} from "@/features/admin/types";

type Props = {
  snapshot: AdminSnapshot;
  refresh: () => Promise<void>;
};

export function AdminClosures({ snapshot, refresh }: Props) {
  const initialDate = useMemo(
    () => nextOpenDate(snapshot.bookingSettings),
    [snapshot.bookingSettings],
  );
  const [rangeMode, setRangeMode] = useState<ClosureRangeMode>("single");
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [period, setPeriod] = useState<SelectableClosurePeriod>("fullDay");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [deleteRequestIds, setDeleteRequestIds] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<ClosureConflict[]>([]);
  const [notice, setNotice] = useState("");
  const [showPast, setShowPast] = useState(false);

  const previewResult = useMemo(() => {
    try {
      return {
        preview: buildClosurePreview({
          startDate,
          endDate: rangeMode === "single" ? startDate : endDate,
          period,
        }, snapshot.bookingSettings),
        error: "",
      };
    } catch (caught) {
      return {
        preview: null,
        error: caught instanceof Error ? caught.message : "登録内容を確認してください。",
      };
    }
  }, [endDate, period, rangeMode, snapshot.bookingSettings, startDate]);
  const today = tokyoDateKey(new Date());
  const allGroups = groupClosureBlocks(snapshot.restBlocks);
  const visibleGroups = allGroups.filter((group) => showPast || group.endDate >= today);

  function resetRequest() {
    setRequestId(null);
    setError("");
    setConflicts([]);
    setNotice("");
  }

  function changeRangeMode(next: ClosureRangeMode) {
    setRangeMode(next);
    if (next === "single") setEndDate(startDate);
    resetRequest();
  }

  function changeStartDate(next: string) {
    setStartDate(next);
    if (rangeMode === "single" || endDate < next) setEndDate(next);
    resetRequest();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const preview = previewResult.preview;
    if (!preview) {
      setError(previewResult.error);
      return;
    }
    const rangeLabel = dateRangeLabel(preview.startDate, preview.endDate);
    if (!confirm(`${rangeLabel}を「${closurePeriodLabel(preview.period)}」で休業登録しますか？`)) {
      return;
    }

    const nextRequestId = requestId ?? crypto.randomUUID();
    setRequestId(nextRequestId);
    setBusyKey("create");
    setError("");
    setConflicts([]);
    setNotice("");
    try {
      const result = await createAdminClosures({
        startDate: preview.startDate,
        endDate: preview.endDate,
        period: preview.period,
        requestId: nextRequestId,
      });
      await refresh();
      setNotice(
        `休業を${result.createdDates.length}日分登録しました。` +
        (result.skippedClosedDates.length > 0
          ? ` 定休日${result.skippedClosedDates.length}日は除外しました。`
          : ""),
      );
      setRequestId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "休業を登録できませんでした。");
      setConflicts(caught instanceof AdminClosureApiError ? caught.conflicts : []);
    } finally {
      setBusyKey("");
    }
  }

  async function removeClosure(
    groupKey: string,
    closureGroupId: string | null,
    block?: AdminRestBlock,
  ) {
    const operationKey = block ? `block:${block.id}` : `group:${groupKey}`;
    const targetLabel = block
      ? `${businessDateLabel(closureBusinessDate(block))}の休業`
      : "この期間の休業すべて";
    if (!confirm(`${targetLabel}を削除しますか？`)) return;

    const nextRequestId = deleteRequestIds[operationKey] ?? crypto.randomUUID();
    setDeleteRequestIds((current) => ({ ...current, [operationKey]: nextRequestId }));
    setBusyKey(operationKey);
    setError("");
    setConflicts([]);
    setNotice("");
    try {
      const result = await deleteAdminClosures({
        closureIds: block ? [block.id] : [],
        ...(block || !closureGroupId ? {} : { closureGroupId }),
        requestId: nextRequestId,
      });
      await refresh();
      setNotice(`休業を${result.deletedIds.length}件削除しました。`);
      setDeleteRequestIds((current) => {
        const next = { ...current };
        delete next[operationKey];
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "休業を削除できませんでした。");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <>
      <div className="admin-console-title">
        <p className="eyebrow">SALON CLOSURES</p>
        <h1>休業登録</h1>
        <p>終日・午前・午後の休業を、1日または期間で登録できます。30分単位の休憩は「休憩」から登録してください。</p>
      </div>
      {error ? <div className="admin-alert is-error" role="alert">{error}</div> : null}
      {conflicts.length > 0 ? <ConflictList conflicts={conflicts} /> : null}
      {notice ? <div className="admin-alert is-success" role="status">{notice}</div> : null}
      <div className="admin-closure-layout">
        <form className="admin-panel admin-closure-form" onSubmit={submit}>
          <div className="admin-section-heading">
            <p className="eyebrow">NEW CLOSURE</p>
            <h2>新しい休業</h2>
          </div>
          <fieldset>
            <legend>登録範囲</legend>
            <div className="admin-closure-segmented">
              <button aria-pressed={rangeMode === "single"} className={rangeMode === "single" ? "is-active" : ""} disabled={Boolean(busyKey)} onClick={() => changeRangeMode("single")} type="button">1日</button>
              <button aria-pressed={rangeMode === "range"} className={rangeMode === "range" ? "is-active" : ""} disabled={Boolean(busyKey)} onClick={() => changeRangeMode("range")} type="button">期間</button>
            </div>
          </fieldset>
          <div className="admin-closure-dates">
            <label>
              <span>{rangeMode === "single" ? "対象日" : "開始日"}</span>
              <input disabled={Boolean(busyKey)} min={today} onChange={(event) => changeStartDate(event.target.value)} required type="date" value={startDate} />
            </label>
            {rangeMode === "range" ? (
              <label>
                <span>終了日</span>
                <input disabled={Boolean(busyKey)} max={addCalendarDays(startDate, 89)} min={startDate} onChange={(event) => { setEndDate(event.target.value); resetRequest(); }} required type="date" value={endDate} />
              </label>
            ) : null}
          </div>
          <fieldset>
            <legend>休業する時間</legend>
            <div className="admin-closure-periods">
              {(["fullDay", "morning", "afternoon"] as const).map((item) => {
                const unavailable = periodUnavailable(item, snapshot.bookingSettings);
                return (
                  <button aria-pressed={period === item} className={period === item ? "is-active" : ""} disabled={Boolean(busyKey) || unavailable} key={item} onClick={() => { setPeriod(item); resetRequest(); }} type="button">
                    <strong>{closurePeriodLabel(item)}</strong>
                    <small>{periodTimeLabel(item, snapshot.bookingSettings)}</small>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className={`admin-closure-preview${previewResult.preview ? "" : " is-error"}`}>
            <small>登録内容</small>
            {previewResult.preview ? (
              <>
                <strong>{dateRangeLabel(previewResult.preview.startDate, previewResult.preview.endDate)}</strong>
                <span>{closurePeriodLabel(previewResult.preview.period)}（{minutesLabel(previewResult.preview.startMinutes)}〜{minutesLabel(previewResult.preview.endMinutes)}）</span>
                <span>登録対象 {previewResult.preview.businessDates.length}日{previewResult.preview.skippedClosedDates.length > 0 ? `・定休日除外 ${previewResult.preview.skippedClosedDates.length}日` : ""}</span>
              </>
            ) : <p>{previewResult.error}</p>}
          </div>
          <button className="admin-closure-submit" disabled={Boolean(busyKey) || !previewResult.preview} type="submit">
            {busyKey === "create" ? "登録中…" : "休業を登録"}
          </button>
        </form>
        <section className="admin-panel admin-closure-list">
          <div className="admin-closure-list-heading">
            <div className="admin-section-heading">
              <p className="eyebrow">REGISTERED</p>
              <h2>登録済みの休業</h2>
            </div>
            <label><input checked={showPast} onChange={(event) => setShowPast(event.target.checked)} type="checkbox" />過去も表示</label>
          </div>
          <div className="admin-closure-cards">
            {visibleGroups.map((group) => (
              <article key={group.key}>
                <header>
                  <div>
                    <span>{closurePeriodLabel(group.period)}</span>
                    <strong>{dateRangeLabel(group.startDate, group.endDate)}</strong>
                    <small>{group.blocks.length}日分・{formatTime(group.blocks[0].startTime)}〜{formatTime(group.blocks[0].endTime)}</small>
                  </div>
                  {group.closureGroupId && group.blocks.length > 1 ? (
                    <button className="is-danger" disabled={Boolean(busyKey)} onClick={() => void removeClosure(group.key, group.closureGroupId)} type="button">
                      {busyKey === `group:${group.key}` ? "削除中…" : "期間を削除"}
                    </button>
                  ) : null}
                </header>
                <details>
                  <summary>日ごとの休業を確認</summary>
                  <div>
                    {group.blocks.map((block) => (
                      <div key={block.id}>
                        <span>{businessDateLabel(closureBusinessDate(block))}　{formatTime(block.startTime)}〜{formatTime(block.endTime)}</span>
                        <button disabled={Boolean(busyKey)} onClick={() => void removeClosure(group.key, group.closureGroupId, block)} type="button">
                          {busyKey === `block:${block.id}` ? "削除中…" : "この日のみ削除"}
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              </article>
            ))}
            {visibleGroups.length === 0 ? <p className="admin-closure-empty">登録済みの休業はありません。</p> : null}
          </div>
        </section>
      </div>
    </>
  );
}

function ConflictList({ conflicts }: { conflicts: ClosureConflict[] }) {
  return (
    <section className="admin-closure-conflicts" aria-label="競合している予定">
      <strong>競合している予定</strong>
      <ul>{conflicts.map((conflict, index) => (
        <li key={`${conflict.businessDate}-${conflict.startAt}-${index}`}>
          {businessDateLabel(conflict.businessDate)} {formatTime(conflict.startAt)}〜{formatTime(conflict.endAt)}
          {conflict.customerName ? ` ${conflict.customerName}様` : " 登録済みの休業"}
        </li>
      ))}</ul>
    </section>
  );
}

function nextOpenDate(settings: AdminBookingSettings) {
  const tomorrow = addCalendarDays(tokyoDateKey(new Date()), 1);
  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = addCalendarDays(tomorrow, offset);
    try {
      buildClosurePreview({
        startDate: candidate,
        endDate: candidate,
        period: "fullDay",
      }, settings);
      return candidate;
    } catch {
      // Continue to the next business day.
    }
  }
  return tomorrow;
}

function periodUnavailable(
  period: SelectableClosurePeriod,
  settings: AdminBookingSettings,
) {
  if (period === "morning") return settings.openingMinutes >= 12 * 60;
  if (period === "afternoon") return settings.closingMinutes <= 12 * 60;
  return false;
}

function periodTimeLabel(
  period: SelectableClosurePeriod,
  settings: AdminBookingSettings,
) {
  const start = period === "afternoon" ? 12 * 60 : settings.openingMinutes;
  const end = period === "morning" ? 12 * 60 : settings.closingMinutes;
  return `${minutesLabel(start)}〜${minutesLabel(end)}`;
}

function dateRangeLabel(startDate: string, endDate: string) {
  return startDate === endDate
    ? businessDateLabel(startDate)
    : `${businessDateLabel(startDate)}〜${businessDateLabel(endDate)}`;
}

function businessDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
