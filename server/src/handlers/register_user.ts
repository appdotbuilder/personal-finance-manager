
import { db } from '../db';
import { usersTable, categoriesTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function registerUser(input: RegisterUserInput): Promise<User> {
  try {
    // Check if user already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash the password (using a simple hash for now - in production use bcrypt)
    const password_hash = await Bun.password.hash(input.password);

    // Create the user
    const userResult = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        full_name: input.full_name
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create default categories for the new user
    const defaultCategories = [
      { user_id: user.id, name: 'Salary', type: 'income' as const, color: '#4CAF50' },
      { user_id: user.id, name: 'Freelance', type: 'income' as const, color: '#8BC34A' },
      { user_id: user.id, name: 'Food & Dining', type: 'expense' as const, color: '#FF5722' },
      { user_id: user.id, name: 'Transportation', type: 'expense' as const, color: '#FF9800' },
      { user_id: user.id, name: 'Shopping', type: 'expense' as const, color: '#E91E63' },
      { user_id: user.id, name: 'Bills & Utilities', type: 'expense' as const, color: '#F44336' }
    ];

    await db.insert(categoriesTable)
      .values(defaultCategories)
      .execute();

    return user;
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}
