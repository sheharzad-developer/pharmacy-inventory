export type Medicine = {
  id: string;
  name: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  price: number;
  createdAt: string; // ISO string
};

export type NewMedicineInput = {
  name: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  price: number;
  /** Set when persisting to PostgreSQL (audit trail). */
  createdByUserId?: string | null;
};

