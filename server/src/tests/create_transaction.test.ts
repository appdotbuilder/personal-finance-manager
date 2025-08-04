
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  let testUserId: number;
  let testCategoryId: number;
  
  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;
    
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Test Category',
        type: 'expense',
        color: '#ff0000'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;
  });
  
  afterEach(resetDB);

  const testInput: CreateTransactionInput = {
    user_id: 0, // Will be set in tests
    category_id: 0, // Will be set in tests
    amount: 29.99,
    description: 'Test transaction',
    transaction_date: new Date('2024-01-15'),
    type: 'expense'
  };

  it('should create a transaction', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId
    };
    
    const result = await createTransaction(input);

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.amount).toEqual(29.99);
    expect(typeof result.amount).toBe('number');
    expect(result.description).toEqual('Test transaction');
    expect(result.transaction_date).toEqual(new Date('2024-01-15'));
    expect(result.type).toEqual('expense');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId
    };
    
    const result = await createTransaction(input);

    // Query using proper drizzle syntax
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(testUserId);
    expect(transactions[0].category_id).toEqual(testCategoryId);
    expect(parseFloat(transactions[0].amount)).toEqual(29.99);
    expect(transactions[0].description).toEqual('Test transaction');
    expect(transactions[0].type).toEqual('expense');
    expect(transactions[0].created_at).toBeInstanceOf(Date);
  });

  it('should create income transaction with income category', async () => {
    // Create income category
    const incomeCategoryResult = await db.insert(categoriesTable)
      .values({
        user_id: testUserId,
        name: 'Salary',
        type: 'income',
        color: '#00ff00'
      })
      .returning()
      .execute();
    
    const input: CreateTransactionInput = {
      user_id: testUserId,
      category_id: incomeCategoryResult[0].id,
      amount: 3000.00,
      description: 'Monthly salary',
      transaction_date: new Date('2024-01-01'),
      type: 'income'
    };
    
    const result = await createTransaction(input);

    expect(result.type).toEqual('income');
    expect(result.amount).toEqual(3000.00);
    expect(result.description).toEqual('Monthly salary');
  });

  it('should throw error when category does not exist', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: 999999 // Non-existent category
    };

    expect(createTransaction(input)).rejects.toThrow(/category not found/i);
  });

  it('should throw error when category belongs to different user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Other User'
      })
      .returning()
      .execute();
    
    const input = {
      ...testInput,
      user_id: otherUserResult[0].id, // Different user
      category_id: testCategoryId // Category belongs to testUserId
    };

    expect(createTransaction(input)).rejects.toThrow(/category not found/i);
  });

  it('should throw error when transaction type does not match category type', async () => {
    const input = {
      ...testInput,
      user_id: testUserId,
      category_id: testCategoryId, // This is an expense category
      type: 'income' as const // But trying to create income transaction
    };

    expect(createTransaction(input)).rejects.toThrow(/transaction type.*does not match.*category type/i);
  });
});
