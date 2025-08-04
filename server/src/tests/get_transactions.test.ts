
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type GetTransactionsInput } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User'
};

const testCategory1 = {
  user_id: 1,
  name: 'Groceries',
  type: 'expense' as const,
  color: '#FF0000'
};

const testCategory2 = {
  user_id: 1,
  name: 'Salary',
  type: 'income' as const,
  color: '#00FF00'
};

const testTransactions = [
  {
    user_id: 1,
    category_id: 1,
    amount: '100.50',
    description: 'Grocery shopping',
    transaction_date: new Date('2024-01-15'),
    type: 'expense' as const
  },
  {
    user_id: 1,
    category_id: 2,
    amount: '2500.00',
    description: 'Monthly salary',
    transaction_date: new Date('2024-02-01'),
    type: 'income' as const
  },
  {
    user_id: 1,
    category_id: 1,
    amount: '75.25',
    description: 'More groceries',
    transaction_date: new Date('2024-02-15'),
    type: 'expense' as const
  }
];

describe('getTransactions', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user
    await db.insert(usersTable).values(testUser).execute();
    
    // Create test categories
    await db.insert(categoriesTable).values([testCategory1, testCategory2]).execute();
    
    // Create test transactions
    await db.insert(transactionsTable).values(testTransactions).execute();
  });
  
  afterEach(resetDB);

  it('should get all transactions for a user', async () => {
    const input: GetTransactionsInput = {
      user_id: 1,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(3);
    expect(result[0].description).toEqual('More groceries'); // Most recent first
    expect(result[1].description).toEqual('Monthly salary');
    expect(result[2].description).toEqual('Grocery shopping');
    
    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toEqual(75.25);
  });

  it('should filter by transaction type', async () => {
    const input: GetTransactionsInput = {
      user_id: 1,
      type: 'expense',
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.type).toEqual('expense');
    });
  });

  it('should filter by category_id', async () => {
    const input: GetTransactionsInput = {
      user_id: 1,
      category_id: 1,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.category_id).toEqual(1);
    });
  });

  it('should filter by month and year', async () => {
    const input: GetTransactionsInput = {
      user_id: 1,
      month: 2,
      year: 2024,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.transaction_date.getMonth()).toEqual(1); // February is month 1 (0-indexed)
      expect(transaction.transaction_date.getFullYear()).toEqual(2024);
    });
  });

  it('should filter by year only', async () => {
    const input: GetTransactionsInput = {
      user_id: 1,
      year: 2024,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(3);
    result.forEach(transaction => {
      expect(transaction.transaction_date.getFullYear()).toEqual(2024);
    });
  });

  it('should support pagination', async () => {
    const input: GetTransactionsInput = {
      user_id: 1,
      limit: 2,
      offset: 1
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(2);
    expect(result[0].description).toEqual('Monthly salary');
    expect(result[1].description).toEqual('Grocery shopping');
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetTransactionsInput = {
      user_id: 999,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(0);
  });

  it('should combine multiple filters', async () => {
    const input: GetTransactionsInput = {
      user_id: 1,
      type: 'expense',
      month: 2,
      year: 2024,
      limit: 50,
      offset: 0
    };

    const result = await getTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('More groceries');
    expect(result[0].type).toEqual('expense');
    expect(result[0].transaction_date.getMonth()).toEqual(1);
    expect(result[0].transaction_date.getFullYear()).toEqual(2024);
  });
});
