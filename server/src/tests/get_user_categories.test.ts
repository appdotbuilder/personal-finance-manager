
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type GetUserCategoriesInput } from '../schema';
import { getUserCategories } from '../handlers/get_user_categories';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User'
};

const testUser2 = {
  email: 'test2@example.com',
  password_hash: 'hashed_password2',
  full_name: 'Test User 2'
};

describe('getUserCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all categories for a user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test categories
    await db.insert(categoriesTable)
      .values([
        {
          user_id: userId,
          name: 'Salary',
          type: 'income',
          color: '#green'
        },
        {
          user_id: userId,
          name: 'Groceries',
          type: 'expense',
          color: '#red'
        },
        {
          user_id: userId,
          name: 'Freelance',
          type: 'income',
          color: null
        }
      ])
      .execute();

    const input: GetUserCategoriesInput = {
      user_id: userId
    };

    const result = await getUserCategories(input);

    expect(result).toHaveLength(3);
    expect(result.some(cat => cat.name === 'Salary')).toBe(true);
    expect(result.some(cat => cat.name === 'Groceries')).toBe(true);
    expect(result.some(cat => cat.name === 'Freelance')).toBe(true);

    // Verify each category has all expected fields
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(category.user_id).toEqual(userId);
      expect(category.name).toBeDefined();
      expect(['income', 'expense']).toContain(category.type);
      expect(category.created_at).toBeInstanceOf(Date);
    });
  });

  it('should filter categories by type', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test categories
    await db.insert(categoriesTable)
      .values([
        {
          user_id: userId,
          name: 'Salary',
          type: 'income',
          color: '#green'
        },
        {
          user_id: userId,
          name: 'Groceries',
          type: 'expense',
          color: '#red'
        },
        {
          user_id: userId,
          name: 'Freelance',
          type: 'income',
          color: null
        }
      ])
      .execute();

    // Test income filter
    const incomeInput: GetUserCategoriesInput = {
      user_id: userId,
      type: 'income'
    };

    const incomeResult = await getUserCategories(incomeInput);

    expect(incomeResult).toHaveLength(2);
    incomeResult.forEach(category => {
      expect(category.type).toEqual('income');
    });

    // Test expense filter
    const expenseInput: GetUserCategoriesInput = {
      user_id: userId,
      type: 'expense'
    };

    const expenseResult = await getUserCategories(expenseInput);

    expect(expenseResult).toHaveLength(1);
    expect(expenseResult[0].type).toEqual('expense');
    expect(expenseResult[0].name).toEqual('Groceries');
  });

  it('should return empty array for user with no categories', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: GetUserCategoriesInput = {
      user_id: userId
    };

    const result = await getUserCategories(input);

    expect(result).toHaveLength(0);
  });

  it('should only return categories for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create categories for both users
    await db.insert(categoriesTable)
      .values([
        {
          user_id: user1Id,
          name: 'User 1 Category',
          type: 'income',
          color: '#blue'
        },
        {
          user_id: user2Id,
          name: 'User 2 Category',
          type: 'expense',
          color: '#orange'
        }
      ])
      .execute();

    const input: GetUserCategoriesInput = {
      user_id: user1Id
    };

    const result = await getUserCategories(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('User 1 Category');
    expect(result[0].user_id).toEqual(user1Id);
  });

  it('should handle nullable color field correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create categories with and without colors
    await db.insert(categoriesTable)
      .values([
        {
          user_id: userId,
          name: 'Colored Category',
          type: 'income',
          color: '#purple'
        },
        {
          user_id: userId,
          name: 'No Color Category',
          type: 'expense',
          color: null
        }
      ])
      .execute();

    const input: GetUserCategoriesInput = {
      user_id: userId
    };

    const result = await getUserCategories(input);

    expect(result).toHaveLength(2);
    
    const coloredCategory = result.find(cat => cat.name === 'Colored Category');
    const noColorCategory = result.find(cat => cat.name === 'No Color Category');

    expect(coloredCategory?.color).toEqual('#purple');
    expect(noColorCategory?.color).toBeNull();
  });
});
