
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetMonthlySummaryInput, type MonthlySummary } from '../schema';
import { eq, and, gte, lt, sum, count } from 'drizzle-orm';

export async function getMonthlySummary(input: GetMonthlySummaryInput): Promise<MonthlySummary> {
  try {
    // Calculate start and end dates for the month
    const startDate = new Date(input.year, input.month - 1, 1); // Month is 0-indexed in Date constructor
    const endDate = new Date(input.year, input.month, 1); // First day of next month

    // Query for income transactions
    const incomeResult = await db.select({
      total: sum(transactionsTable.amount),
      count: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.user_id, input.user_id),
      eq(transactionsTable.type, 'income'),
      gte(transactionsTable.transaction_date, startDate),
      lt(transactionsTable.transaction_date, endDate)
    ))
    .execute();

    // Query for expense transactions
    const expenseResult = await db.select({
      total: sum(transactionsTable.amount),
      count: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.user_id, input.user_id),
      eq(transactionsTable.type, 'expense'),
      gte(transactionsTable.transaction_date, startDate),
      lt(transactionsTable.transaction_date, endDate)
    ))
    .execute();

    // Extract totals and counts (handle null values from aggregation)
    const totalIncome = incomeResult[0]?.total ? parseFloat(incomeResult[0].total) : 0;
    const incomeCount = incomeResult[0]?.count || 0;
    
    const totalExpense = expenseResult[0]?.total ? parseFloat(expenseResult[0].total) : 0;
    const expenseCount = expenseResult[0]?.count || 0;

    const balance = totalIncome - totalExpense;
    const transactionCount = incomeCount + expenseCount;

    return {
      total_income: totalIncome,
      total_expense: totalExpense,
      balance: balance,
      month: input.month,
      year: input.year,
      transaction_count: transactionCount
    };
  } catch (error) {
    console.error('Monthly summary calculation failed:', error);
    throw error;
  }
}
