import type { BookingAvailability } from "@/features/booking/booking-availability";

export type BookingAvailabilityRange = {
  from: Date;
  until: Date;
};

type AvailabilityLoader = (
  range: BookingAvailabilityRange,
) => Promise<BookingAvailability>;

type CacheEntry = {
  promise?: Promise<BookingAvailability>;
  value?: BookingAvailability;
  loadedAt?: number;
};

const defaultTtlMs = 30_000;

export function createBookingAvailabilityStore(
  loader: AvailabilityLoader,
  options: {
    now?: () => number;
    ttlMs?: number;
  } = {},
) {
  const entries = new Map<string, CacheEntry>();
  const now = options.now ?? Date.now;
  const ttlMs = options.ttlMs ?? defaultTtlMs;

  function request(range: BookingAvailabilityRange) {
    const key = rangeKey(range);
    const cached = entries.get(key);

    if (
      cached?.value &&
      cached.loadedAt !== undefined &&
      now() - cached.loadedAt <= ttlMs
    ) {
      return Promise.resolve(cached.value);
    }
    if (cached?.promise) return cached.promise;

    const promise = loader(range).then(
      (availability) => {
        if (availability.availabilityIsLive) {
          entries.set(key, {
            value: availability,
            loadedAt: now(),
          });
        } else {
          entries.delete(key);
        }
        return availability;
      },
      (error: unknown) => {
        entries.delete(key);
        throw error;
      },
    );
    entries.set(key, { promise });
    return promise;
  }

  return {
    get: request,
    prefetch: request,
  };
}

function rangeKey(range: BookingAvailabilityRange) {
  return `${range.from.toISOString()}_${range.until.toISOString()}`;
}
