
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'password123',
  full_name: 'Test User'
};

const loginInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user data for valid credentials', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('test@example.com');
    expect(result!.full_name).toEqual('Test User');
    expect(result!.password_hash).toEqual('password123');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user', async () => {
    const result = await loginUser({
      email: 'nonexistent@example.com',
      password: 'password123'
    });

    expect(result).toBeNull();
  });

  it('should return null for invalid password', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser({
      email: 'test@example.com',
      password: 'wrongpassword'
    });

    expect(result).toBeNull();
  });

  it('should return null for correct email but wrong password case', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser({
      email: 'test@example.com',
      password: 'Password123' // Different case
    });

    expect(result).toBeNull();
  });

  it('should be case sensitive for email', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser({
      email: 'TEST@EXAMPLE.COM', // Different case
      password: 'password123'
    });

    expect(result).toBeNull();
  });
});
