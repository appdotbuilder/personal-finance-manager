
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq, and } from 'drizzle-orm';

describe('createCategory', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a category with all fields', async () => {
    const testInput: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Groceries',
      type: 'expense',
      color: '#FF0000'
    };

    const result = await createCategory(testInput);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.name).toEqual('Groceries');
    expect(result.type).toEqual('expense');
    expect(result.color).toEqual('#FF0000');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a category without color', async () => {
    const testInput: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Salary',
      type: 'income'
    };

    const result = await createCategory(testInput);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.name).toEqual('Salary');
    expect(result.type).toEqual('income');
    expect(result.color).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const testInput: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Entertainment',
      type: 'expense',
      color: '#00FF00'
    };

    const result = await createCategory(testInput);

    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Entertainment');
    expect(categories[0].type).toEqual('expense');
    expect(categories[0].color).toEqual('#00FF00');
    expect(categories[0].user_id).toEqual(testUserId);
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple categories for same user', async () => {
    const input1: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Food',
      type: 'expense'
    };

    const input2: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Bonus',
      type: 'income'
    };

    const result1 = await createCategory(input1);
    const result2 = await createCategory(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.user_id).toEqual(testUserId);
    expect(result2.user_id).toEqual(testUserId);

    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.user_id, testUserId))
      .execute();

    expect(categories).toHaveLength(2);
  });

  it('should allow same category name for different users', async () => {
    // Create second user
    const userResult2 = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User 2'
      })
      .returning()
      .execute();
    
    const testUserId2 = userResult2[0].id;

    const input1: CreateCategoryInput = {
      user_id: testUserId,
      name: 'Travel',
      type: 'expense'
    };

    const input2: CreateCategoryInput = {
      user_id: testUserId2,
      name: 'Travel',
      type: 'expense'
    };

    const result1 = await createCategory(input1);
    const result2 = await createCategory(input2);

    expect(result1.name).toEqual('Travel');
    expect(result2.name).toEqual('Travel');
    expect(result1.user_id).toEqual(testUserId);
    expect(result2.user_id).toEqual(testUserId2);
    expect(result1.id).not.toEqual(result2.id);
  });
});
