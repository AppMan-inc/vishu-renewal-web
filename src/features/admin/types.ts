export type AdminRole = "owner" | "manager" | "staff";
export type ReservationStatus = "confirmed" | "visited" | "canceled";
export type ClosurePeriod = "fullDay" | "morning" | "afternoon" | "custom";

export type AdminSession = {
  uid: string;
  email: string;
  role: AdminRole;
};

export type AdminMenu = {
  id: string;
  treatmentDetail: string;
  menuIntroduction: string;
  treatmentDetailList: string[];
  menuImageUrl: string;
  menuImagePath: string;
  treatmentTimeMinutes: number;
  beforePrice: number;
  afterPrice: number;
  isCallable: boolean;
  isNeedExtraMoney: boolean;
  priority: number;
  updatedAt: string | null;
};

export type AdminReservation = {
  id: string;
  sourcePath: string;
  customerId: string;
  customerName: string;
  telephoneNumber: string;
  menuId: string;
  treatmentDetail: string;
  treatmentTimeMinutes: number;
  price: number;
  startTime: string;
  finishTime: string;
  customerHope: string;
  status: ReservationStatus;
  previousVisitAt: string | null;
  createdAt: string;
};

export type AdminRestBlock = {
  id: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  closurePeriod: ClosurePeriod;
  closureGroupId: string | null;
  businessDate: string | null;
};

export type AdminBookingSettings = {
  openingMinutes: number;
  closingMinutes: number;
  slotIntervalMinutes: number;
  closedWeekdays: number[];
};

export type AdminCustomer = {
  id: string;
  displayName: string;
  email: string;
  telephoneNumber: string;
  dateOfBirth: string;
  gender: string;
  sharedNote: string;
  pushTokenCount: number;
};

export type AdminPushNotification = {
  id: string;
  title: string;
  content: string;
  targetLabel: string;
  recipientDeviceCount: number;
  createdAt: string | null;
};

export type AdminEmailNotification = {
  id: string;
  title: string;
  content: string;
  targetLabel: string;
  recipientEmailCount: number;
  status: "queued" | "sent" | "failed";
  createdAt: string | null;
};

export type KarteEntry = {
  id: string;
  customerId: string;
  reservationId: string | null;
  treatmentAt: string;
  menuName: string;
  treatmentNote: string;
  colorFormulaNote: string;
  nextVisitNote: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSnapshot = {
  session: AdminSession;
  menus: AdminMenu[];
  reservations: AdminReservation[];
  restBlocks: AdminRestBlock[];
  bookingSettings: AdminBookingSettings;
  customers: AdminCustomer[];
  karteEntries: KarteEntry[];
  pushNotifications: AdminPushNotification[];
  emailNotifications: AdminEmailNotification[];
  notificationDeviceCount: number;
  notificationEmailCount: number;
  fetchedAt: string;
};

export type AdminSection =
  | "dashboard"
  | "reservations"
  | "rests"
  | "closures"
  | "customers"
  | "menus"
  | "sales"
  | "notifications";
