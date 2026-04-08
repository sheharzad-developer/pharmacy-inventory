export type UserRole = "admin" | "staff" | "pharmacist";

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
};

export type Session = {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
