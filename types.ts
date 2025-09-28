export enum TransactionType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum Currency {
    EGP = 'EGP',
    USD = 'USD',
}

export enum RevenueCategory {
  GENERAL = 'إيراد عام',
  ZAKAT = 'زكاة',
  SADAQA = 'صدقة',
  PROJECT_A = 'دعم مشروع أ',
  EVENT_REVENUE = 'إيرادات فعاليات',
  GRANTS = 'منح ومساعدات',
}

export enum ExpenseCategory {
  OPERATIONAL = 'تشغيلي',
  SALARIES = 'رواتب',
  UTILITIES = 'خدمات ومرافق',
  PROJECT_COSTS = 'تكاليف مشاريع',
  RELIEF_AID = 'مساعدات إغاثية',
  REWARDS = 'مكافآت',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  date: string;
  description: string;
  category: RevenueCategory | ExpenseCategory;
  receiptImage?: string;
  recipient?: string;
  exchangeRate?: number;
  projectId?: string;
}

export enum UserRole {
  ADMIN = 'مسؤول',
  TREASURER = 'أمين صندوق',
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  password?: string;
}

export interface RevenueSource {
  id: string;
  name: string;
}

export enum Frequency {
    MONTHLY = 'شهري',
    YEARLY = 'سنوي',
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  category: ExpenseCategory;
  frequency: Frequency;
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
}

export enum DisbursementMethod {
    CASH = 'نقدي',
    BANK_TRANSFER = 'تحويل بنكي',
    IN_KIND = 'عيني',
}

export interface DisbursementRecord {
    id: string;
    name: string;
    nationalId: string;
    disbursementDate: string;
    method: DisbursementMethod;
    phone: string;
    amount: number;
    currency: Currency;
}

export interface DisbursementSheet {
    id: string;
    name: string;
    createdAt: string;
    records: DisbursementRecord[];
}

export interface AppSettings {
    usdToEgpRate: number;
}

export interface Budget {
    category: ExpenseCategory;
    amount: number;
    currency: Currency; // Budgets are managed in USD.
}

export interface Project {
  id: string;
  name: string;
  description: string;
  budget: number;
}

export interface CustodyItem {
  id: string;
  itemName: string;
  custodianName: string;
  receivedDate: string; // YYYY-MM-DD
}

export interface DebtItem {
  id: string;
  creditorName: string;
  amount: number;
  currency: Currency;
  description: string;
  date: string; // Due date
}

export type Page = 'dashboard' | 'revenues' | 'expenses' | 'reports' | 'users' | 'revenueSources' | 'recurringExpenses' | 'disbursement' | 'settings' | 'projects' | 'rewards' | 'custody' | 'notes' | 'debts';