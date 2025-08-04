
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user', async () => {
    const result = await registerUser(testInput);

    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].password_hash).toBeDefined();
  });

  it('should hash the password', async () => {
    const result = await registerUser(testInput);

    // Verify password is hashed and can be verified
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should create default categories for new user', async () => {
    const result = await registerUser(testInput);

    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.user_id, result.id))
      .execute();

    expect(categories).toHaveLength(6);

    // Check income categories
    const incomeCategories = categories.filter(c => c.type === 'income');
    expect(incomeCategories).toHaveLength(2);
    expect(incomeCategories.map(c => c.name)).toContain('Salary');
    expect(incomeCategories.map(c => c.name)).toContain('Freelance');

    // Check expense categories
    const expenseCategories = categories.filter(c => c.type === 'expense');
    expect(expenseCategories).toHaveLength(4);
    expect(expenseCategories.map(c => c.name)).toContain('Food & Dining');
    expect(expenseCategories.map(c => c.name)).toContain('Transportation');
    expect(expenseCategories.map(c => c.name)).toContain('Shopping');
    expect(expenseCategories.map(c => c.name)).toContain('Bills & Utilities');

    // Verify all categories have colors
    categories.forEach(category => {
      expect(category.color).toBeDefined();
      expect(category.color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  it('should throw error for duplicate email', async () => {
    // First registration should succeed
    await registerUser(testInput);

    // Second registration with same email should fail
    await expect(registerUser(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle different user data correctly', async () => {
    const differentInput: RegisterUserInput = {
      email: 'another@test.com',
      password: 'different123',
      full_name: 'Another User'
    };

    const result = await registerUser(differentInput);

    expect(result.email).toEqual('another@test.com');
    expect(result.full_name).toEqual('Another User');

    // Verify password hashing works for different passwords
    const isValid = await Bun.password.verify('different123', result.password_hash);
    expect(isValid).toBe(true);
  });
});
