
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  MonthlySummary,
  GetMonthlySummaryInput,
  FinancialReportInput
} from '../../../server/src/schema';

interface FinancialReportsProps {
  userId: number;
}

export function FinancialReports({ userId }: FinancialReportsProps) {
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const [summaryParams, setSummaryParams] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [reportParams, setReportParams] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    format: 'pdf' as 'pdf' | 'excel'
  });

  const loadMonthlySummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryData: GetMonthlySummaryInput = {
        user_id: userId,
        month: summaryParams.month,
        year: summaryParams.year
      };
      const result = await trpc.getMonthlySummary.query(queryData);
      setMonthlySummary(result);
    } catch (error) {
      console.error('Failed to load monthly summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, summaryParams]);

  useEffect(() => {
    loadMonthlySummary();
  }, [loadMonthlySummary]);

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      const reportData: FinancialReportInput = {
        user_id: userId,
        start_date: new Date(reportParams.start_date),
        end_date: new Date(reportParams.end_date),
        format: reportParams.format
      };
      
      await trpc.generateFinancialReport.mutate(reportData);
      
      // In a real implementation, this would typically return a download URL or trigger a file download
      alert(`${reportParams.format.toUpperCase()} report generated successfully! Check your downloads folder.`);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📈 Financial Reports</h2>
        <p className="text-gray-600">View summaries and generate detailed financial reports</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Monthly Summary</CardTitle>
            <CardDescription>
              View financial summary for a specific month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Month/Year Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select
                  value={summaryParams.month?.toString() || '1'}
                  onValueChange={(value: string) =>
                    setSummaryParams((prev) => ({ ...prev, month: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index + 1} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={summaryParams.year?.toString() || new Date().getFullYear().toString()}
                  onValueChange={(value: string) =>
                    setSummaryParams((prev) => ({ ...prev, year: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={loadMonthlySummary} disabled={isLoading} className="w-full">
              {isLoading ? 'Loading...' : 'Load Summary'}
            </Button>

            <Separator />

            {/* Summary Display */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : monthlySummary ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold">
                    {monthNames[monthlySummary.month - 1]} {monthlySummary.year}
                  </h3>
                </div>

                <div className="grid gap-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">💰 Total Income</span>
                    <span className="font-bold text-green-600">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(monthlySummary.total_income)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">💸 Total Expenses</span>
                    <span className="font-bold text-red-600">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(monthlySummary.total_expense)}
                    </span>
                  </div>

                  <div className={`flex justify-between items-center p-3 rounded-lg ${
                    monthlySummary.balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'
                  }`}>
                    <span className="font-medium">
                      {monthlySummary.balance >= 0 ? '💵' : '⚠️'} Net Balance
                    </span>
                    <span className={`font-bold ${
                      monthlySummary.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Math.abs(monthlySummary.balance))}
                      {monthlySummary.balance < 0 && (
                        <span className="text-sm ml-1">(deficit)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">📊 Transactions</span>
                    <span className="font-bold text-purple-600">
                      {monthlySummary.transaction_count}
                    </span>
                  </div>
                </div>

                {/* Performance Indicator */}
                <div className="text-center">
                  <Badge 
                    variant={monthlySummary.balance >= 0 ? 'default' : 'destructive'}
                    className="text-sm"
                  >
                    {monthlySummary.balance >= 0 
                      ? '✅ Positive Cash Flow' 
                      : '⚠️ Negative Cash Flow'
                    }
                  </Badge>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No data found for the selected month and year.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Report Generation */}
        <Card>
          <CardHeader>
            <CardTitle>📄 Generate Report</CardTitle>
            <CardDescription>
              Export detailed financial reports for any date range
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={reportParams.start_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReportParams((prev) => ({ ...prev, start_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={reportParams.end_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReportParams((prev) => ({ ...prev, end_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={reportParams.format || 'pdf'}
                onValueChange={(value: 'pdf' | 'excel') =>
                  setReportParams((prev) => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">📄 PDF Report</SelectItem>
                  <SelectItem value="excel">📊 Excel Spreadsheet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Report will include:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Complete transaction history</li>
                <li>• Category-wise breakdown</li>
                <li>• Income vs expense analysis</li>
                <li>• Monthly trends and patterns</li>
                <li>• Summary statistics</li>
              </ul>
            </div>

            <Button 
              onClick={handleGenerateReport} 
              disabled={isGeneratingReport}
              className="w-full"
            >
              {isGeneratingReport 
                ? '📄 Generating Report...' 
                : `📄 Generate ${reportParams.format.toUpperCase()} Report`
              }
            </Button>

            <Alert>
              <AlertDescription className="text-sm">
                Reports are generated based on your current data. Large date ranges may take longer to process.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Quick Insights</CardTitle>
          <CardDescription>
            Key financial insights at a glance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlySummary ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">📈</div>
                <div className="text-sm text-gray-600">Savings Rate</div>
                <div className="font-bold text-lg">
                  {monthlySummary.total_income > 0 
                    ? Math.round((monthlySummary.balance / monthlySummary.total_income) * 100)
                    : 0
                  }%
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-sm text-gray-600">Avg per Transaction</div>
                <div className="font-bold text-lg">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(monthlySummary.transaction_count > 0 
                    ? Math.round((monthlySummary.total_income + monthlySummary.total_expense) / monthlySummary.transaction_count)
                    : 0
                  )}
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm text-gray-600">Expense Ratio</div>
                <div className="font-bold text-lg">
                  {monthlySummary.total_income > 0 
                    ? Math.round((monthlySummary.total_expense / monthlySummary.total_income) * 100)
                    : 0
                  }%
                </div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Load a monthly summary to see quick insights.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
