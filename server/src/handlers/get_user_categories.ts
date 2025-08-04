
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type GetUserCategoriesInput, type Category } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getUserCategories(input: GetUserCategoriesInput): Promise<Category[]> {
  try {
    // Build base query
    let query = db.select().from(categoriesTable);

    // Build conditions array
    const conditions = [eq(categoriesTable.user_id, input.user_id)];

    // Add optional type filter
    if (input.type) {
      conditions.push(eq(categoriesTable.type, input.type));
    }

    // Apply where clause and execute
    const results = await query
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    // Return results (no numeric conversion needed for this table)
    return results;
  } catch (error) {
    console.error('Get user categories failed:', error);
    throw error;
  }
}
