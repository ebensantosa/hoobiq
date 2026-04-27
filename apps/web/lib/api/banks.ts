import { api } from "./client";

export type BankAccount = {
  id: string;
  bank: string;
  numberLast4: string;
  holderName: string;
  primary: boolean;
  verified: boolean;
};

export type BankInput = {
  bank: string;
  number: string;
  holderName: string;
  primary?: boolean;
};

export const banksApi = {
  list:   () => api<{ items: BankAccount[] }>("/bank-accounts"),
  create: (body: BankInput) => api<BankAccount>("/bank-accounts", { method: "POST", body }),
  update: (id: string, body: Partial<BankInput>) =>
    api<BankAccount>(`/bank-accounts/${id}`, { method: "PATCH", body }),
  remove: (id: string) => api<void>(`/bank-accounts/${id}`, { method: "DELETE" }),
};
