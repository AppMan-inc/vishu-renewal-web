import { z } from "zod";

export const reservationStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const createReservationSchema = z.object({
  salonId: z.string().min(1),
  menuId: z.string().min(1),
  startAt: z.iso.datetime(),
  customer: z.object({
    name: z.string().trim().min(1).max(80),
    email: z.email(),
    phone: z.string().trim().min(8).max(20),
  }),
  note: z.string().trim().max(500).default(""),
});

export type CreateReservationInput = z.infer<
  typeof createReservationSchema
>;
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
