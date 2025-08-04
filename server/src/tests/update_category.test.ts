
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type UpdateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category name', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Original Name',
        type: 'expense',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Update category name
    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Updated Name'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Updated Name');
    expect(result.type).toEqual('expense');
    expect(result.color).toEqual('#ff0000');
    expect(result.user_id).toEqual(userId);
  });

  it('should update category color', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
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
        type: 'income',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Update category color
    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      color: '#00ff00'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Test Category');
    expect(result.color).toEqual('#00ff00');
    expect(result.type).toEqual('income');
  });

  it('should update both name and color', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Original Category',
        type: 'expense',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Update both name and color
    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Updated Category',
      color: '#0000ff'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Updated Category');
    expect(result.color).toEqual('#0000ff');
    expect(result.type).toEqual('expense');
  });

  it('should set color to null', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test category with color
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Test Category',
        type: 'income',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Update color to null
    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      color: null
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.color).toBeNull();
    expect(result.name).toEqual('Test Category');
  });

  it('should save updates to database', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        user_id: userId,
        name: 'Original Name',
        type: 'expense',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Update category
    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Updated Name',
      color: '#00ff00'
    };

    await updateCategory(updateInput);

    // Verify changes in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Updated Name');
    expect(categories[0].color).toEqual('#00ff00');
    expect(categories[0].type).toEqual('expense');
  });

  it('should throw error for non-existent category', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 99999,
      name: 'New Name'
    };

    expect(updateCategory(updateInput)).rejects.toThrow(/Category with id 99999 not found/i);
  });

  it('should return existing category when no fields to update', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
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
        type: 'income',
        color: '#ff0000'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Update with no fields
    const updateInput: UpdateCategoryInput = {
      id: categoryId
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Test Category');
    expect(result.color).toEqual('#ff0000');
    expect(result.type).toEqual('income');
  });
});
