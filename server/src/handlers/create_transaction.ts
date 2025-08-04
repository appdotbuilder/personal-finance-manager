
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Validate that the category exists and belongs to the user
    const categories = await db.select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, input.category_id),
          eq(categoriesTable.user_id, input.user_id)
        )
      )
      .execute();

    if (categories.length === 0) {
      throw new Error('Category not found or does not belong to user');
    }

    const category = categories[0];

    // Validate that transaction type matches category type
    if (category.type !== input.type) {
      throw new Error(`Transaction type '${input.type}' does not match category type '${category.type}'`);
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        category_id: input.category_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        transaction_date: input.transaction_date,
        type: input.type
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};
