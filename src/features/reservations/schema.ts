import { z } from "zod";
import { FORM_FIELD_LIMITS } from "../form-validation.ts";

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
    name: z.string().trim().min(1).max(FORM_FIELD_LIMITS.personName),
    email: z.email().max(FORM_FIELD_LIMITS.email),
    phone: z.string().regex(/^[0-9]{10,11}$/),
  }),
  note: z.string().trim().max(FORM_FIELD_LIMITS.inquiryMessage).default(""),
});

export type CreateReservationInput = z.infer<
  typeof createReservationSchema
>;
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
