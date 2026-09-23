export interface Category {
  id: string;
  name: string;
  icon: string | null;
  monthly_budget: number | null;
}

export interface Expense {
  id: string;
  amount: number;
  category_id: string;
  description: string | null;
  source: 'web' | 'telegram';
  expense_date: string;
  created_at: string;
}

export interface Income {
  id: string;
  amount: number;
  description: string | null;
  source: 'web' | 'telegram';
  income_date: string;
  created_at: string;
}

export interface Balance {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
}