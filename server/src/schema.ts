
import { z } from 'zod';

// User authentication schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1)
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Category schemas
export const categoryTypeEnum = z.enum(['income', 'expense']);
export type CategoryType = z.infer<typeof categoryTypeEnum>;

export const categorySchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  type: categoryTypeEnum,
  color: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1),
  type: categoryTypeEnum,
  color: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Transaction schemas
export const transactionTypeEnum = z.enum(['income', 'expense']);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  category_id: z.number(),
  amount: z.number(),
  description: z.string(),
  transaction_date: z.coerce.date(),
  type: transactionTypeEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  user_id: z.number(),
  category_id: z.number(),
  amount: z.number().positive(),
  description: z.string().min(1),
  transaction_date: z.coerce.date(),
  type: transactionTypeEnum
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const updateTransactionInputSchema = z.object({
  id: z.number(),
  category_id: z.number().optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  transaction_date: z.coerce.date().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Monthly summary schemas
export const monthlySummarySchema = z.object({
  total_income: z.number(),
  total_expense: z.number(),
  balance: z.number(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  transaction_count: z.number().int()
});

export type MonthlySummary = z.infer<typeof monthlySummarySchema>;

export const getMonthlySummaryInputSchema = z.object({
  user_id: z.number(),
  month: z.number().int().min(1).max(12),
  year: z.number().int()
});

export type GetMonthlySummaryInput = z.infer<typeof getMonthlySummaryInputSchema>;

// Financial report schemas
export const financialReportInputSchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  format: z.enum(['pdf', 'excel']).optional().default('pdf')
});

export type FinancialReportInput = z.infer<typeof financialReportInputSchema>;

// Dashboard data schemas
export const dashboardDataSchema = z.object({
  current_month_summary: monthlySummarySchema,
  recent_transactions: z.array(transactionSchema),
  category_breakdown: z.array(z.object({
    category_name: z.string(),
    category_color: z.string().nullable(),
    total_amount: z.number(),
    type: transactionTypeEnum
  })),
  monthly_trend: z.array(z.object({
    month: z.string(),
    income: z.number(),
    expense: z.number(),
    balance: z.number()
  })),
  budget_alerts: z.array(z.object({
    message: z.string(),
    severity: z.enum(['info', 'warning', 'error'])
  }))
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// Query input schemas
export const getTransactionsInputSchema = z.object({
  user_id: z.number(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().optional(),
  type: transactionTypeEnum.optional(),
  category_id: z.number().optional(),
  limit: z.number().int().positive().optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;

export const getUserCategoriesInputSchema = z.object({
  user_id: z.number(),
  type: categoryTypeEnum.optional()
});

export type GetUserCategoriesInput = z.infer<typeof getUserCategoriesInputSchema>;
