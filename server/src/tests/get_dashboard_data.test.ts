
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';

describe('getDashboardData', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return empty dashboard data for user with no data', async () => {
        // Create a user first
        const userResult = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                full_name: 'Test User'
            })
            .returning()
            .execute();

        const userId = userResult[0].id;

        const result = await getDashboardData({ user_id: userId });

        expect(result.current_month_summary.total_income).toBe(0);
        expect(result.current_month_summary.total_expense).toBe(0);
        expect(result.current_month_summary.balance).toBe(0);
        expect(result.current_month_summary.transaction_count).toBe(0);
        expect(result.recent_transactions).toHaveLength(0);
        expect(result.category_breakdown).toHaveLength(0);
        expect(result.monthly_trend).toHaveLength(0);
        expect(result.budget_alerts).toHaveLength(1);
        expect(result.budget_alerts[0].severity).toBe('info');
    });

    it('should return dashboard data with transactions', async () => {
        // Create user
        const userResult = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                full_name: 'Test User'
            })
            .returning()
            .execute();

        const userId = userResult[0].id;

        // Create income category
        const incomeCategoryResult = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Salary',
                type: 'income',
                color: '#00FF00'
            })
            .returning()
            .execute();

        // Create expense category
        const expenseCategoryResult = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Food',
                type: 'expense',
                color: '#FF0000'
            })
            .returning()
            .execute();

        const incomeCategoryId = incomeCategoryResult[0].id;
        const expenseCategoryId = expenseCategoryResult[0].id;

        // Create transactions for current month
        const currentDate = new Date();
        const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);

        await db.insert(transactionsTable)
            .values([
                {
                    user_id: userId,
                    category_id: incomeCategoryId,
                    amount: '5000.00',
                    description: 'Monthly salary',
                    transaction_date: currentMonthDate,
                    type: 'income'
                },
                {
                    user_id: userId,
                    category_id: expenseCategoryId,
                    amount: '200.50',
                    description: 'Groceries',
                    transaction_date: currentMonthDate,
                    type: 'expense'
                },
                {
                    user_id: userId,
                    category_id: expenseCategoryId,
                    amount: '150.75',
                    description: 'Restaurant',
                    transaction_date: currentMonthDate,
                    type: 'expense'
                }
            ])
            .execute();

        const result = await getDashboardData({ user_id: userId });

        // Check current month summary
        expect(result.current_month_summary.total_income).toBe(5000);
        expect(result.current_month_summary.total_expense).toBe(351.25);
        expect(result.current_month_summary.balance).toBe(4648.75);
        expect(result.current_month_summary.transaction_count).toBe(3);
        expect(result.current_month_summary.month).toBe(currentDate.getMonth() + 1);
        expect(result.current_month_summary.year).toBe(currentDate.getFullYear());

        // Check recent transactions
        expect(result.recent_transactions).toHaveLength(3);
        expect(result.recent_transactions[0].amount).toEqual(expect.any(Number));

        // Check category breakdown
        expect(result.category_breakdown).toHaveLength(2);
        const incomeCategory = result.category_breakdown.find(c => c.type === 'income');
        const expenseCategory = result.category_breakdown.find(c => c.type === 'expense');
        
        expect(incomeCategory).toBeDefined();
        expect(incomeCategory!.category_name).toBe('Salary');
        expect(incomeCategory!.total_amount).toBe(5000);
        expect(incomeCategory!.category_color).toBe('#00FF00');

        expect(expenseCategory).toBeDefined();
        expect(expenseCategory!.category_name).toBe('Food');
        expect(expenseCategory!.total_amount).toBe(351.25);
        expect(expenseCategory!.category_color).toBe('#FF0000');

        // Check monthly trend
        expect(result.monthly_trend.length).toBeGreaterThanOrEqual(1);
        const currentMonthTrend = result.monthly_trend.find(trend => 
            trend.month.includes(currentDate.getFullYear().toString())
        );
        expect(currentMonthTrend).toBeDefined();

        // Check budget alerts
        expect(result.budget_alerts).toHaveLength(1);
        expect(result.budget_alerts[0].severity).toBe('info');
    });

    it('should generate warning alert when spending is high', async () => {
        // Create user
        const userResult = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                full_name: 'Test User'
            })
            .returning()
            .execute();

        const userId = userResult[0].id;

        // Create categories
        const incomeCategoryResult = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Salary',
                type: 'income'
            })
            .returning()
            .execute();

        const expenseCategoryResult = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Expenses',
                type: 'expense'
            })
            .returning()
            .execute();

        const currentDate = new Date();
        const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);

        // Create transactions where expense is 90% of income
        await db.insert(transactionsTable)
            .values([
                {
                    user_id: userId,
                    category_id: incomeCategoryResult[0].id,
                    amount: '1000.00',
                    description: 'Income',
                    transaction_date: currentMonthDate,
                    type: 'income'
                },
                {
                    user_id: userId,
                    category_id: expenseCategoryResult[0].id,
                    amount: '900.00',
                    description: 'High expense',
                    transaction_date: currentMonthDate,
                    type: 'expense'
                }
            ])
            .execute();

        const result = await getDashboardData({ user_id: userId });

        expect(result.budget_alerts).toHaveLength(1);
        expect(result.budget_alerts[0].severity).toBe('warning');
        expect(result.budget_alerts[0].message).toContain('80%');
    });

    it('should generate error alert when expenses exceed income', async () => {
        // Create user
        const userResult = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                full_name: 'Test User'
            })
            .returning()
            .execute();

        const userId = userResult[0].id;

        // Create categories
        const incomeCategoryResult = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Salary',
                type: 'income'
            })
            .returning()
            .execute();

        const expenseCategoryResult = await db.insert(categoriesTable)
            .values({
                user_id: userId,
                name: 'Expenses',
                type: 'expense'
            })
            .returning()
            .execute();

        const currentDate = new Date();
        const currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);

        // Create transactions where expense exceeds income
        await db.insert(transactionsTable)
            .values([
                {
                    user_id: userId,
                    category_id: incomeCategoryResult[0].id,
                    amount: '1000.00',
                    description: 'Income',
                    transaction_date: currentMonthDate,
                    type: 'income'
                },
                {
                    user_id: userId,
                    category_id: expenseCategoryResult[0].id,
                    amount: '1200.00',
                    description: 'Overspending',
                    transaction_date: currentMonthDate,
                    type: 'expense'
                }
            ])
            .execute();

        const result = await getDashboardData({ user_id: userId });

        expect(result.budget_alerts).toHaveLength(1);
        expect(result.budget_alerts[0].severity).toBe('error');
        expect(result.budget_alerts[0].message).toContain('spent');
        expect(result.budget_alerts[0].message).toContain('more than you earned');
    });
});
