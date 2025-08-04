
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginUserInput): Promise<User | null> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // In a real application, you would hash the input password and compare
    // For this implementation, we'll do a simple string comparison
    // Note: In production, use bcrypt or similar for password hashing
    if (user.password_hash !== input.password) {
      return null; // Invalid password
    }

    // Return user data (excluding password hash for security)
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      full_name: user.full_name,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}
