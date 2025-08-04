
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const deleteTransactionInputSchema = z.object({
    id: z.number(),
    user_id: z.number() // For authorization
});

type DeleteTransactionInput = z.infer<typeof deleteTransactionInputSchema>;

export async function deleteTransaction(input: DeleteTransactionInput): Promise<{ success: boolean }> {
    try {
        // Delete transaction that belongs to the specified user
        const result = await db.delete(transactionsTable)
            .where(and(
                eq(transactionsTable.id, input.id),
                eq(transactionsTable.user_id, input.user_id)
            ))
            .returning()
            .execute();

        // Return success status based on whether a row was deleted
        return { success: result.length > 0 };
    } catch (error) {
        console.error('Transaction deletion failed:', error);
        throw error;
    }
}
