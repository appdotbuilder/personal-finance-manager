
import { db } from '../db';
import { usersTable, categoriesTable, transactionsTable } from '../db/schema';
import { type DashboardData } from '../schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const getDashboardDataInputSchema = z.object({
    user_id: z.number()
});

type GetDashboardDataInput = z.infer<typeof getDashboardDataInputSchema>;

export async function getDashboardData(input: GetDashboardDataInput): Promise<DashboardData> {
    const { user_id } = input;
    
    // Get current month bounds
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const monthStart = new Date(currentYear, currentDate.getMonth(), 1);
    const monthEnd = new Date(currentYear, currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get current month summary
    const currentMonthTransactions = await db.select({
        type: transactionsTable.type,
        amount: transactionsTable.amount
    })
    .from(transactionsTable)
    .where(and(
        eq(transactionsTable.user_id, user_id),
        gte(transactionsTable.transaction_date, monthStart),
        lte(transactionsTable.transaction_date, monthEnd)
    ))
    .execute();

    let totalIncome = 0;
    let totalExpense = 0;
    let transactionCount = 0;

    currentMonthTransactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount);
        transactionCount++;
        
        if (transaction.type === 'income') {
            totalIncome += amount;
        } else {
            totalExpense += amount;
        }
    });

    const balance = totalIncome - totalExpense;

    // Get recent transactions (last 10)
    const recentTransactionsQuery = await db.select()
        .from(transactionsTable)
        .where(eq(transactionsTable.user_id, user_id))
        .orderBy(desc(transactionsTable.transaction_date))
        .limit(10)
        .execute();

    const recentTransactions = recentTransactionsQuery.map(transaction => ({
        ...transaction,
        amount: parseFloat(transaction.amount)
    }));

    // Get category breakdown for current month
    const categoryBreakdownQuery = await db.select({
        category_name: categoriesTable.name,
        category_color: categoriesTable.color,
        type: categoriesTable.type,
        total_amount: sql<string>`sum(${transactionsTable.amount})`
    })
    .from(transactionsTable)
    .innerJoin(categoriesTable, eq(transactionsTable.category_id, categoriesTable.id))
    .where(and(
        eq(transactionsTable.user_id, user_id),
        gte(transactionsTable.transaction_date, monthStart),
        lte(transactionsTable.transaction_date, monthEnd)
    ))
    .groupBy(categoriesTable.id, categoriesTable.name, categoriesTable.color, categoriesTable.type)
    .execute();

    const categoryBreakdown = categoryBreakdownQuery.map(category => ({
        category_name: category.category_name,
        category_color: category.category_color,
        total_amount: parseFloat(category.total_amount),
        type: category.type
    }));

    // Get monthly trend for last 6 months
    const sixMonthsAgo = new Date(currentYear, currentDate.getMonth() - 5, 1);
    const monthlyTrendQuery = await db.select({
        month: sql<string>`to_char(${transactionsTable.transaction_date}, 'YYYY-MM')`,
        type: transactionsTable.type,
        total_amount: sql<string>`sum(${transactionsTable.amount})`
    })
    .from(transactionsTable)
    .where(and(
        eq(transactionsTable.user_id, user_id),
        gte(transactionsTable.transaction_date, sixMonthsAgo)
    ))
    .groupBy(sql`to_char(${transactionsTable.transaction_date}, 'YYYY-MM')`, transactionsTable.type)
    .orderBy(sql`to_char(${transactionsTable.transaction_date}, 'YYYY-MM')`)
    .execute();

    // Aggregate monthly trend data
    const monthlyTrendMap = new Map<string, { income: number; expense: number }>();
    
    monthlyTrendQuery.forEach(row => {
        const month = row.month;
        const amount = parseFloat(row.total_amount);
        
        if (!monthlyTrendMap.has(month)) {
            monthlyTrendMap.set(month, { income: 0, expense: 0 });
        }
        
        const monthData = monthlyTrendMap.get(month)!;
        if (row.type === 'income') {
            monthData.income = amount;
        } else {
            monthData.expense = amount;
        }
    });

    const monthlyTrend = Array.from(monthlyTrendMap.entries()).map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense
    }));

    // Generate budget alerts (simple alerts based on spending patterns)
    const budgetAlerts = [];
    
    if (totalExpense > totalIncome) {
        budgetAlerts.push({
            message: `You've spent $${totalExpense.toFixed(2)} more than you earned this month`,
            severity: 'error' as const
        });
    } else if (totalExpense > totalIncome * 0.8) {
        budgetAlerts.push({
            message: `You've spent 80% or more of your income this month`,
            severity: 'warning' as const
        });
    } else {
        budgetAlerts.push({
            message: `Your spending is under control this month`,
            severity: 'info' as const
        });
    }

    return {
        current_month_summary: {
            total_income: totalIncome,
            total_expense: totalExpense,
            balance,
            month: currentMonth,
            year: currentYear,
            transaction_count: transactionCount
        },
        recent_transactions: recentTransactions,
        category_breakdown: categoryBreakdown,
        monthly_trend: monthlyTrend,
        budget_alerts: budgetAlerts
    };
}
