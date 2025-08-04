
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetTransactionsInput, type Transaction } from '../schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';

export async function getTransactions(input: GetTransactionsInput): Promise<Transaction[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Always filter by user_id
    conditions.push(eq(transactionsTable.user_id, input.user_id));

    // Filter by type if provided
    if (input.type) {
      conditions.push(eq(transactionsTable.type, input.type));
    }

    // Filter by category_id if provided
    if (input.category_id) {
      conditions.push(eq(transactionsTable.category_id, input.category_id));
    }

    // Filter by month and year if provided
    if (input.month !== undefined && input.year !== undefined) {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);
      
      conditions.push(gte(transactionsTable.transaction_date, startDate));
      conditions.push(lte(transactionsTable.transaction_date, endDate));
    } else if (input.year !== undefined) {
      // Filter by year only
      const startDate = new Date(input.year, 0, 1);
      const endDate = new Date(input.year, 11, 31, 23, 59, 59, 999);
      
      conditions.push(gte(transactionsTable.transaction_date, startDate));
      conditions.push(lte(transactionsTable.transaction_date, endDate));
    }

    // Build and execute the query
    const results = await db.select()
      .from(transactionsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(transactionsTable.transaction_date))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Get transactions failed:', error);
    throw error;
  }
}
