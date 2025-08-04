
import { db } from '../db';
import { categoriesTable, transactionsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const deleteCategoryInputSchema = z.object({
    id: z.number(),
    user_id: z.number() // For authorization
});

type DeleteCategoryInput = z.infer<typeof deleteCategoryInputSchema>;

export async function deleteCategory(input: DeleteCategoryInput): Promise<{ success: boolean }> {
    try {
        // First, check if the category exists and belongs to the user
        const category = await db.select()
            .from(categoriesTable)
            .where(and(
                eq(categoriesTable.id, input.id),
                eq(categoriesTable.user_id, input.user_id)
            ))
            .execute();

        if (category.length === 0) {
            throw new Error('Category not found or does not belong to user');
        }

        // Check if the category has any associated transactions
        const transactions = await db.select()
            .from(transactionsTable)
            .where(eq(transactionsTable.category_id, input.id))
            .execute();

        if (transactions.length > 0) {
            throw new Error('Cannot delete category with existing transactions');
        }

        // Delete the category
        const result = await db.delete(categoriesTable)
            .where(and(
                eq(categoriesTable.id, input.id),
                eq(categoriesTable.user_id, input.user_id)
            ))
            .execute();

        return { success: true };
    } catch (error) {
        console.error('Category deletion failed:', error);
        throw error;
    }
}
