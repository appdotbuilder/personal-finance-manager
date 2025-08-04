
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { DashboardData } from '../../../server/src/schema';

interface DashboardProps {
  userId: number;
}

export function Dashboard({ userId }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getDashboardData.query({ user_id: userId });
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertDescription>
          Failed to load dashboard data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const { current_month_summary, recent_transactions, category_breakdown, monthly_trend, budget_alerts } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Budget Alerts */}
      {budget_alerts.length > 0 && (
        <div className="space-y-2">
          {budget_alerts.map((alert, index) => (
            <Alert key={index} className={
              alert.severity === 'error' ? 'border-red-200 bg-red-50' :
              alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              'border-blue-200 bg-blue-50'
            }>
              <AlertDescription className={
                alert.severity === 'error' ? 'text-red-600' :
                alert.severity === 'warning' ? 'text-yellow-600' :
                'text-blue-600'
              }>
                {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Monthly Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">💰 Total Income</CardTitle>
            <CardDescription className="text-green-100">
              This month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${current_month_summary.total_income.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">💸 Total Expenses</CardTitle>
            <CardDescription className="text-red-100">
              This month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${current_month_summary.total_expense.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r ${
          current_month_summary.balance >= 0 
            ? 'from-blue-500 to-blue-600' 
            : 'from-orange-500 to-orange-600'
        } text-white`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {current_month_summary.balance >= 0 ? '💵' : '⚠️'} Balance
            </CardTitle>
            <CardDescription className={
              current_month_summary.balance >= 0 ? 'text-blue-100' : 'text-orange-100'
            }>
              This month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.abs(current_month_summary.balance).toLocaleString()}
              {current_month_summary.balance < 0 && (
                <span className="text-sm ml-2">(deficit)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">📊 Transactions</CardTitle>
            <CardDescription className="text-purple-100">
              This month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {current_month_summary.transaction_count}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Recent Transactions</CardTitle>
            <CardDescription>
              Your latest financial activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recent_transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No transactions yet. Start by adding your first transaction!
              </p>
            ) : (
              <div className="space-y-3">
                {recent_transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{transaction.description}</span>
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                          {transaction.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {transaction.transaction_date.toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>🏷️ Category Breakdown</CardTitle>
            <CardDescription>
              Spending by category this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {category_breakdown.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No category data available yet.
              </p>
            ) : (
              <div className="space-y-3">
                {category_breakdown.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.category_color || '#6b7280' }}
                      ></div>
                      <span className="text-sm font-medium">{category.category_name}</span>
                      <Badge variant={category.type === 'income' ? 'default' : 'secondary'}>
                        {category.type}
                      </Badge>
                    </div>
                    <span className={`font-bold ${
                      category.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${category.total_amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      {monthly_trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📈 Monthly Trend</CardTitle>
            <CardDescription>
              Income vs Expenses over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthly_trend.map((month, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{month.month}</h4>
                    <Badge variant={month.balance >= 0 ? 'default' : 'destructive'}>
                      Balance: ${month.balance.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-green-600">
                      Income: ${month.income.toLocaleString()}
                    </div>
                    <div className="text-red-600">
                      Expenses: ${month.expense.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
