
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateTransaction = async (input: UpdateTransactionInput): Promise<Transaction> => {
  try {
    // First, get the existing transaction
    const existingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (existingTransactions.length === 0) {
      throw new Error('Transaction not found');
    }

    const existingTransaction = existingTransactions[0];

    // If category_id is being updated, verify it exists and belongs to the same user
    if (input.category_id !== undefined) {
      const categories = await db.select()
        .from(categoriesTable)
        .where(and(
          eq(categoriesTable.id, input.category_id),
          eq(categoriesTable.user_id, existingTransaction.user_id)
        ))
        .execute();

      if (categories.length === 0) {
        throw new Error('Category not found or does not belong to user');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }

    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString(); // Convert number to string for numeric column
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.transaction_date !== undefined) {
      updateData.transaction_date = input.transaction_date;
    }

    // Update the transaction
    const result = await db.update(transactionsTable)
      .set(updateData)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
};
