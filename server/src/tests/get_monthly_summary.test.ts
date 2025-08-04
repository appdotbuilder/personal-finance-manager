
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type GetMonthlySummaryInput } from '../schema';
import { getMonthlySummary } from '../handlers/get_monthly_summary';

// Test input
const testInput: GetMonthlySummaryInput = {
  user_id: 1,
  month: 3,
  year: 2024
};

describe('getMonthlySummary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero values for month with no transactions', async () => {
    // Create user and category first
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hash123',
      full_name: 'Test User'
    }).execute();

    const result = await getMonthlySummary(testInput);

    expect(result.total_income).toEqual(0);
    expect(result.total_expense).toEqual(0);
    expect(result.balance).toEqual(0);
    expect(result.month).toEqual(3);
    expect(result.year).toEqual(2024);
    expect(result.transaction_count).toEqual(0);
  });

  it('should calculate summary correctly with income and expense transactions', async () => {
    // Create user
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hash123',
      full_name: 'Test User'
    }).execute();

    // Create categories
    await db.insert(categoriesTable).values([
      {
        user_id: 1,
        name: 'Salary',
        type: 'income',
        color: '#00ff00'
      },
      {
        user_id: 1,
        name: 'Food',
        type: 'expense',
        color: '#ff0000'
      }
    ]).execute();

    // Create transactions in March 2024
    await db.insert(transactionsTable).values([
      {
        user_id: 1,
        category_id: 1,
        amount: '5000.00', // Convert to string for numeric column
        description: 'Monthly salary',
        transaction_date: new Date('2024-03-15'),
        type: 'income'
      },
      {
        user_id: 1,
        category_id: 1,
        amount: '1000.00',
        description: 'Bonus',
        transaction_date: new Date('2024-03-20'),
        type: 'income'
      },
      {
        user_id: 1,
        category_id: 2,
        amount: '300.50',
        description: 'Groceries',
        transaction_date: new Date('2024-03-10'),
        type: 'expense'
      },
      {
        user_id: 1,
        category_id: 2,
        amount: '150.25',
        description: 'Restaurant',
        transaction_date: new Date('2024-03-25'),
        type: 'expense'
      }
    ]).execute();

    const result = await getMonthlySummary(testInput);

    expect(result.total_income).toEqual(6000.00); // 5000 + 1000
    expect(result.total_expense).toEqual(450.75); // 300.50 + 150.25
    expect(result.balance).toEqual(5549.25); // 6000 - 450.75
    expect(result.month).toEqual(3);
    expect(result.year).toEqual(2024);
    expect(result.transaction_count).toEqual(4);
  });

  it('should only include transactions from specified month and year', async () => {
    // Create user and category
    await db.insert(usersTable).values({
      email: 'test@example.com',
      password_hash: 'hash123',
      full_name: 'Test User'
    }).execute();

    await db.insert(categoriesTable).values({
      user_id: 1,
      name: 'Salary',
      type: 'income',
      color: '#00ff00'
    }).execute();

    // Create transactions in different months/years
    await db.insert(transactionsTable).values([
      {
        user_id: 1,
        category_id: 1,
        amount: '1000.00',
        description: 'March 2024 transaction',
        transaction_date: new Date('2024-03-15'),
        type: 'income'
      },
      {
        user_id: 1,
        category_id: 1,
        amount: '2000.00',
        description: 'February 2024 transaction',
        transaction_date: new Date('2024-02-15'),
        type: 'income'
      },
      {
        user_id: 1,
        category_id: 1,
        amount: '3000.00',
        description: 'March 2023 transaction',
        transaction_date: new Date('2023-03-15'),
        type: 'income'
      },
      {
        user_id: 1,
        category_id: 1,
        amount: '4000.00',
        description: 'April 2024 transaction',
        transaction_date: new Date('2024-04-01'),
        type: 'income'
      }
    ]).execute();

    const result = await getMonthlySummary(testInput);

    // Should only include the March 2024 transaction
    expect(result.total_income).toEqual(1000.00);
    expect(result.total_expense).toEqual(0);
    expect(result.balance).toEqual(1000.00);
    expect(result.transaction_count).toEqual(1);
  });

  it('should only include transactions for specified user', async () => {
    // Create two users
    await db.insert(usersTable).values([
      {
        email: 'user1@example.com',
        password_hash: 'hash123',
        full_name: 'User One'
      },
      {
        email: 'user2@example.com',
        password_hash: 'hash456',
        full_name: 'User Two'
      }
    ]).execute();

    // Create categories for both users
    await db.insert(categoriesTable).values([
      {
        user_id: 1,
        name: 'User 1 Income',
        type: 'income',
        color: '#00ff00'
      },
      {
        user_id: 2,
        name: 'User 2 Income',
        type: 'income',
        color: '#0000ff'
      }
    ]).execute();

    // Create transactions for both users in March 2024
    await db.insert(transactionsTable).values([
      {
        user_id: 1,
        category_id: 1,
        amount: '1000.00',
        description: 'User 1 transaction',
        transaction_date: new Date('2024-03-15'),
        type: 'income'
      },
      {
        user_id: 2,
        category_id: 2,
        amount: '2000.00',
        description: 'User 2 transaction',
        transaction_date: new Date('2024-03-15'),
        type: 'income'
      }
    ]).execute();

    const result = await getMonthlySummary(testInput); // user_id: 1

    // Should only include User 1's transactions
    expect(result.total_income).toEqual(1000.00);
    expect(result.total_expense).toEqual(0);
    expect(result.balance).toEqual(1000.00);
    expect(result.transaction_count).toEqual(1);
  });
});
