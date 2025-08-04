
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a transaction that belongs to the user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: user.id,
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: user.id,
        category_id: category.id,
        amount: '50.00',
        description: 'Test transaction',
        transaction_date: new Date(),
        type: 'expense'
      })
      .returning()
      .execute();
    const transaction = transactionResult[0];

    // Delete the transaction
    const result = await deleteTransaction({
      id: transaction.id,
      user_id: user.id
    });

    expect(result.success).toBe(true);

    // Verify transaction was deleted
    const remainingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction.id))
      .execute();

    expect(remainingTransactions).toHaveLength(0);
  });

  it('should return false when transaction does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Try to delete non-existent transaction
    const result = await deleteTransaction({
      id: 99999,
      user_id: user.id
    });

    expect(result.success).toBe(false);
  });

  it('should return false when transaction belongs to different user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        full_name: 'User One'
      })
      .returning()
      .execute();
    const user1 = user1Result[0];

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        full_name: 'User Two'
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // Create category for user1
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: user1.id,
        name: 'Test Category',
        type: 'expense'
      })
      .returning()
      .execute();
    const category = categoryResult[0];

    // Create transaction for user1
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: user1.id,
        category_id: category.id,
        amount: '50.00',
        description: 'Test transaction',
        transaction_date: new Date(),
        type: 'expense'
      })
      .returning()
      .execute();
    const transaction = transactionResult[0];

    // Try to delete transaction as user2
    const result = await deleteTransaction({
      id: transaction.id,
      user_id: user2.id
    });

    expect(result.success).toBe(false);

    // Verify transaction still exists
    const remainingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction.id))
      .execute();

    expect(remainingTransactions).toHaveLength(1);
  });
});
