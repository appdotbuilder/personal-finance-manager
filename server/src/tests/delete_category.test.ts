
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq } from 'drizzle-orm';

describe('deleteCategory', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should delete a category with no transactions', async () => {
        // Create a test user
        const userResult = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                full_name: 'Test User'
            })
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Create a test category
        const categoryResult = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Test Category',
                type: 'expense',
                color: '#FF0000'
            })
            .returning()
            .execute();
        const categoryId = categoryResult[0].id;

        // Delete the category
        const result = await deleteCategory({
            id: categoryId,
            user_id: userId
        });

        expect(result.success).toBe(true);

        // Verify category was deleted
        const categories = await db.select()
            .from(categoriesTable)
            .where(eq(categoriesTable.id, categoryId))
            .execute();

        expect(categories).toHaveLength(0);
    });

    it('should throw error for non-existent category', async () => {
        // Create a test user
        const userResult = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                full_name: 'Test User'
            })
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Try to delete non-existent category
        await expect(deleteCategory({
            id: 999,
            user_id: userId
        })).rejects.toThrow(/category not found/i);
    });

    it('should throw error when category belongs to different user', async () => {
        // Create two test users
        const user1Result = await db.insert(usersTable)
            .values({
                email: 'user1@example.com',
                password_hash: 'hashedpassword',
                full_name: 'User 1'
            })
            .returning()
            .execute();
        const user1Id = user1Result[0].id;

        const user2Result = await db.insert(usersTable)
            .values({
                email: 'user2@example.com',
                password_hash: 'hashedpassword',
                full_name: 'User 2'
            })
            .returning()
            .execute();
        const user2Id = user2Result[0].id;

        // Create category for user1
        const categoryResult = await db.insert(categoriesTable)
            .values({
                user_id: user1Id,
                name: 'User 1 Category',
                type: 'expense',
                color: '#FF0000'
            })
            .returning()
            .execute();
        const categoryId = categoryResult[0].id;

        // Try to delete with user2's ID
        await expect(deleteCategory({
            id: categoryId,
            user_id: user2Id
        })).rejects.toThrow(/category not found/i);
    });

    it('should throw error when category has associated transactions', async () => {
        // Create a test user
        const userResult = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                full_name: 'Test User'
            })
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Create a test category
        const categoryResult = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Category with Transactions',
                type: 'expense',
                color: '#FF0000'
            })
            .returning()
            .execute();
        const categoryId = categoryResult[0].id;

        // Create a transaction for this category
        await db.insert(transactionsTable)
            .values({
                user_id: userId,
                category_id: categoryId,
                amount: '100.00',
                description: 'Test transaction',
                transaction_date: new Date(),
                type: 'expense'
            })
            .execute();

        // Try to delete the category
        await expect(deleteCategory({
            id: categoryId,
            user_id: userId
        })).rejects.toThrow(/cannot delete category with existing transactions/i);

        // Verify category still exists
        const categories = await db.select()
            .from(categoriesTable)
            .where(eq(categoriesTable.id, categoryId))
            .execute();

        expect(categories).toHaveLength(1);
    });

    it('should only delete the specified category', async () => {
        // Create a test user
        const userResult = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                full_name: 'Test User'
            })
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Create two test categories
        const category1Result = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Category 1',
                type: 'expense',
                color: '#FF0000'
            })
            .returning()
            .execute();
        const category1Id = category1Result[0].id;

        const category2Result = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Category 2',
                type: 'income',
                color: '#00FF00'
            })
            .returning()
            .execute();
        const category2Id = category2Result[0].id;

        // Delete only the first category
        const result = await deleteCategory({
            id: category1Id,
            user_id: userId
        });

        expect(result.success).toBe(true);

        // Verify first category was deleted
        const category1Check = await db.select()
            .from(categoriesTable)
            .where(eq(categoriesTable.id, category1Id))
            .execute();
        expect(category1Check).toHaveLength(0);

        // Verify second category still exists
        const category2Check = await db.select()
            .from(categoriesTable)
            .where(eq(categoriesTable.id, category2Id))
            .execute();
        expect(category2Check).toHaveLength(1);
        expect(category2Check[0].name).toBe('Category 2');
    });
});
