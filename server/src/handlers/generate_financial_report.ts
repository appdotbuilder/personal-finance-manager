
import { db } from '../db';
import { transactionsTable, categoriesTable } from '../db/schema';
import { type FinancialReportInput } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { z } from 'zod';

const financialReportResponseSchema = z.object({
    file_url: z.string(),
    file_name: z.string(),
    format: z.enum(['pdf', 'excel'])
});

type FinancialReportResponse = z.infer<typeof financialReportResponseSchema>;

export async function generateFinancialReport(input: FinancialReportInput): Promise<FinancialReportResponse> {
    try {
        // Ensure format has a default value if not provided
        const format = input.format || 'pdf';

        // Query transactions with category data for the specified date range
        const transactionsQuery = db.select({
            id: transactionsTable.id,
            amount: transactionsTable.amount,
            description: transactionsTable.description,
            transaction_date: transactionsTable.transaction_date,
            type: transactionsTable.type,
            category_name: categoriesTable.name,
            category_color: categoriesTable.color
        })
        .from(transactionsTable)
        .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
        .where(and(
            eq(transactionsTable.user_id, input.user_id),
            gte(transactionsTable.transaction_date, input.start_date),
            lte(transactionsTable.transaction_date, input.end_date)
        ))
        .orderBy(desc(transactionsTable.transaction_date));

        const transactions = await transactionsQuery.execute();

        // Convert numeric amounts to numbers
        const processedTransactions = transactions.map(transaction => ({
            ...transaction,
            amount: parseFloat(transaction.amount)
        }));

        // Calculate summary statistics
        const totalIncome = processedTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = processedTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalIncome - totalExpense;

        // Group by category for breakdown
        const categoryBreakdown = processedTransactions.reduce((acc, transaction) => {
            const key = `${transaction.category_name}_${transaction.type}`;
            if (!acc[key]) {
                acc[key] = {
                    category_name: transaction.category_name,
                    category_color: transaction.category_color,
                    type: transaction.type,
                    total_amount: 0,
                    transaction_count: 0
                };
            }
            acc[key].total_amount += transaction.amount;
            acc[key].transaction_count += 1;
            return acc;
        }, {} as Record<string, any>);

        // Generate file name with timestamp and date range
        const startDateStr = input.start_date.toISOString().split('T')[0];
        const endDateStr = input.end_date.toISOString().split('T')[0];
        const timestamp = Date.now();
        const fileName = `financial_report_${startDateStr}_to_${endDateStr}_${timestamp}.${format}`;

        // In a real implementation, this would:
        // 1. Generate PDF/Excel file with the transaction data, summaries, and charts
        // 2. Save the file to a storage location (filesystem, S3, etc.)
        // 3. Return the actual file URL
        
        // For now, return a mock response indicating successful report generation
        const fileUrl = `/reports/${fileName}`;

        return {
            file_url: fileUrl,
            file_name: fileName,
            format: format
        };

    } catch (error) {
        console.error('Financial report generation failed:', error);
        throw error;
    }
}
