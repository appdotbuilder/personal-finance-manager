
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type UpdateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;
  let testTransactionId: number;
  let otherCategoryId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test categories
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Groceries',
        type: 'expense',
        color: '#FF0000'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    const otherCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Entertainment',
        type: 'expense',
        color: '#00FF00'
      })
      .returning()
      .execute();
    otherCategoryId = otherCategoryResult[0].id;

    // Create test transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: testUserId,
        category_id: testCategoryId,
        amount: '50.00',
        description: 'Original grocery shopping',
        transaction_date: new Date('2024-01-15'),
        type: 'expense'
      })
      .returning()
      .execute();
    testTransactionId = transactionResult[0].id;
  });

  it('should update transaction amount', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      amount: 75.50
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.amount).toEqual(75.50);
    expect(typeof result.amount).toEqual('number');
    expect(result.description).toEqual('Original grocery shopping'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction description', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      description: 'Updated grocery shopping'
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.description).toEqual('Updated grocery shopping');
    expect(result.amount).toEqual(50); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction category', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      category_id: otherCategoryId
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.category_id).toEqual(otherCategoryId);
    expect(result.description).toEqual('Original grocery shopping'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction date', async () => {
    const newDate = new Date('2024-02-20');
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      transaction_date: newDate
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.transaction_date).toEqual(newDate);
    expect(result.description).toEqual('Original grocery shopping'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const newDate = new Date('2024-03-10');
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      category_id: otherCategoryId,
      amount: 125.75,
      description: 'Updated entertainment expense',
      transaction_date: newDate
    };

    const result = await updateTransaction(input);

    expect(result.id).toEqual(testTransactionId);
    expect(result.category_id).toEqual(otherCategoryId);
    expect(result.amount).toEqual(125.75);
    expect(result.description).toEqual('Updated entertainment expense');
    expect(result.transaction_date).toEqual(newDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated transaction to database', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      amount: 99.99,
      description: 'Database test update'
    };

    await updateTransaction(input);

    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, testTransactionId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(parseFloat(transactions[0].amount)).toEqual(99.99);
    expect(transactions[0].description).toEqual('Database test update');
    expect(transactions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent transaction', async () => {
    const input: UpdateTransactionInput = {
      id: 99999,
      amount: 100
    };

    expect(updateTransaction(input)).rejects.toThrow(/transaction not found/i);
  });

  it('should throw error for invalid category', async () => {
    const input: UpdateTransactionInput = {
      id: testTransactionId,
      category_id: 99999
    };

    expect(updateTransaction(input)).rejects.toThrow(/category not found/i);
  });

  it('should throw error when category belongs to different user', async () => {
    // Create another user and category
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password',
        full_name: 'Other User'
      })
      .returning()
      .execute();

    const otherUserCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: otherUserResult[0].id,
        name: 'Other Category',
        type: 'expense'
      })
      .returning()
      .execute();

    const input: UpdateTransactionInput = {
      id: testTransactionId,
      category_id: otherUserCategoryResult[0].id
    };

    expect(updateTransaction(input)).rejects.toThrow(/category not found or does not belong to user/i);
  });
});
