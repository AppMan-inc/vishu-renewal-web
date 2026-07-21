export type AdminRole = "owner" | "manager" | "staff";
export type ReservationStatus = "confirmed" | "visited" | "canceled";

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
  createdAt: string;
};

export type AdminRestBlock = {
  id: string;
  startTime: string;
  endTime: string;
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  displayName: string;
  telephoneNumber: string;
  dateOfBirth: string;
  gender: string;
  sharedNote: string;
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
  customers: AdminCustomer[];
  karteEntries: KarteEntry[];
  fetchedAt: string;
};

export type AdminSection =
  | "dashboard"
  | "reservations"
  | "rests"
  | "customers"
  | "menus"
  | "sales";
