
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type FinancialReportInput, financialReportInputSchema } from '../schema';
import { generateFinancialReport } from '../handlers/generate_financial_report';

// Test data setup
const testUser = {
    email: 'test@example.com',
    password_hash: 'hashed_password',
    full_name: 'Test User'
};

const testIncomeCategory = {
    name: 'Salary',
    type: 'income' as const,
    color: '#00ff00'
};

const testExpenseCategory = {
    name: 'Food',
    type: 'expense' as const,
    color: '#ff0000'
};

describe('generateFinancialReport', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should generate a financial report with valid data', async () => {
        // Create test user
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Create test categories
        const incomeCategory = await db.insert(categoriesTable)
            .values({ ...testIncomeCategory, user_id: userId })
            .returning()
            .execute();

        const expenseCategory = await db.insert(categoriesTable)
            .values({ ...testExpenseCategory, user_id: userId })
            .returning()
            .execute();

        // Create test transactions
        const testTransactions = [
            {
                user_id: userId,
                category_id: incomeCategory[0].id,
                amount: '1000.00',
                description: 'Monthly salary',
                transaction_date: new Date('2024-01-15'),
                type: 'income' as const
            },
            {
                user_id: userId,
                category_id: expenseCategory[0].id,
                amount: '200.50',
                description: 'Groceries',
                transaction_date: new Date('2024-01-20'),
                type: 'expense' as const
            }
        ];

        await db.insert(transactionsTable)
            .values(testTransactions)
            .execute();

        const input: FinancialReportInput = {
            user_id: userId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31'),
            format: 'pdf'
        };

        const result = await generateFinancialReport(input);

        // Verify response structure
        expect(result.file_url).toBeDefined();
        expect(result.file_name).toBeDefined();
        expect(result.format).toEqual('pdf');

        // Verify file name contains date range and format
        expect(result.file_name).toMatch(/financial_report_2024-01-01_to_2024-01-31_\d+\.pdf/);
        expect(result.file_url).toMatch(/^\/reports\//);
    });

    it('should handle Excel format request', async () => {
        // Create minimal test data
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();
        const userId = userResult[0].id;

        const input: FinancialReportInput = {
            user_id: userId,
            start_date: new Date('2024-02-01'),
            end_date: new Date('2024-02-28'),
            format: 'excel'
        };

        const result = await generateFinancialReport(input);

        expect(result.format).toEqual('excel');
        expect(result.file_name).toMatch(/\.excel$/);
        expect(result.file_name).toMatch(/financial_report_2024-02-01_to_2024-02-28_\d+\.excel/);
    });

    it('should handle empty date range with no transactions', async () => {
        // Create user but no transactions
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();
        const userId = userResult[0].id;

        const input: FinancialReportInput = {
            user_id: userId,
            start_date: new Date('2024-03-01'),
            end_date: new Date('2024-03-31'),
            format: 'pdf'
        };

        const result = await generateFinancialReport(input);

        expect(result.file_url).toBeDefined();
        expect(result.file_name).toBeDefined();
        expect(result.format).toEqual('pdf');
        expect(result.file_name).toMatch(/financial_report_2024-03-01_to_2024-03-31_\d+\.pdf/);
    });

    it('should handle transactions outside date range', async () => {
        // Create test user and category
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();
        const userId = userResult[0].id;

        const categoryResult = await db.insert(categoriesTable)
            .values({ ...testIncomeCategory, user_id: userId })
            .returning()
            .execute();

        // Create transaction outside the report date range
        await db.insert(transactionsTable)
            .values({
                user_id: userId,
                category_id: categoryResult[0].id,
                amount: '500.00',
                description: 'Outside range transaction',
                transaction_date: new Date('2023-12-31'), // Before report range
                type: 'income' as const
            })
            .execute();

        const input: FinancialReportInput = {
            user_id: userId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31'),
            format: 'pdf'
        };

        const result = await generateFinancialReport(input);

        expect(result.file_url).toBeDefined();
        expect(result.file_name).toBeDefined();
        expect(result.format).toEqual('pdf');
    });

    it('should use default PDF format when format not specified', async () => {
        const userResult = await db.insert(usersTable)
            .values(testUser)
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Parse input through Zod schema to apply defaults
        const rawInput = {
            user_id: userId,
            start_date: new Date('2024-01-01'),
            end_date: new Date('2024-01-31')
            // format intentionally omitted to test default
        };

        const input = financialReportInputSchema.parse(rawInput);
        const result = await generateFinancialReport(input);

        expect(result.format).toEqual('pdf');
        expect(result.file_name).toMatch(/\.pdf$/);
    });
});
