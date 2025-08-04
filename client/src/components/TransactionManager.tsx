
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { 
  Transaction, 
  Category, 
  CreateTransactionInput, 
  UpdateTransactionInput,
  TransactionType,
  GetTransactionsInput
} from '../../../server/src/schema';

interface TransactionManagerProps {
  userId: number;
}

export function TransactionManager({ userId }: TransactionManagerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<{
    type: TransactionType | 'all';
    category_id: number | 'all';
    month: number | 'all';
    year: number | 'all';
  }>({
    type: 'all',
    category_id: 'all',
    month: 'all',
    year: new Date().getFullYear()
  });

  const [formData, setFormData] = useState<CreateTransactionInput>({
    user_id: userId,
    category_id: 0,
    amount: 0,
    description: '',
    transaction_date: new Date(),
    type: 'expense'
  });

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const queryData: GetTransactionsInput = {
        user_id: userId,
        limit: 50,
        offset: 0,
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.category_id !== 'all' && { category_id: filters.category_id }),
        ...(filters.month !== 'all' && { month: filters.month }),
        ...(filters.year !== 'all' && { year: filters.year })
      };
      const result = await trpc.getTransactions.query(queryData);
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, filters]);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getUserCategories.query({ user_id: userId });
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingTransaction) {
        const updateData: UpdateTransactionInput = {
          id: editingTransaction.id,
          category_id: formData.category_id,
          amount: formData.amount,
          description: formData.description,
          transaction_date: formData.transaction_date
        };
        await trpc.updateTransaction.mutate(updateData);
      } else {
        await trpc.createTransaction.mutate(formData);
      }
      
      await loadTransactions();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (transactionId: number) => {
    try {
      await trpc.deleteTransaction.mutate({ id: transactionId, user_id: userId });
      await loadTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: userId,
      category_id: 0,
      amount: 0,
      description: '',
      transaction_date: new Date(),
      type: 'expense'
    });
    setEditingTransaction(null);
  };

  const startEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      user_id: userId,
      category_id: transaction.category_id,
      amount: transaction.amount,
      description: transaction.description,
      transaction_date: transaction.transaction_date,
      type: transaction.type
    });
    setIsDialogOpen(true);
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const getCategoryColor = (categoryId: number) => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  const filteredCategories = categories.filter((cat: Category) => 
    cat.type === formData.type
  );

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">💳 Transaction Management</h2>
          <p className="text-gray-600">Track your income and expenses</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              ➕ Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? '✏️ Edit Transaction' : '➕ Add New Transaction'}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction 
                  ? 'Update the transaction details below.'
                  : 'Enter the details for your new transaction.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type || 'expense'}
                  onValueChange={(value: TransactionType) =>
                    setFormData((prev: CreateTransactionInput) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">💰 Income</SelectItem>
                    <SelectItem value="expense">💸 Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id?.toString() || '0'}
                  onValueChange={(value: string) =>
                    setFormData((prev: CreateTransactionInput) => ({ ...prev, category_id: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color || '#6b7280' }}
                          ></div>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateTransactionInput) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter transaction description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateTransactionInput) => ({ ...prev, description: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.transaction_date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateTransactionInput) => ({ ...prev, transaction_date: new Date(e.target.value) }))
                  }
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !formData.category_id}>
                  {isLoading ? 'Saving...' : editingTransaction ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={filters.type || 'all'}
                onValueChange={(value: TransactionType | 'all') =>
                  setFilters((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={filters.category_id?.toString() || 'all'}
                onValueChange={(value: string) =>
                  setFilters((prev) => ({ ...prev, category_id: value === 'all' ? 'all' : parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={filters.month?.toString() || 'all'}
                onValueChange={(value: string) =>
                  setFilters((prev) => ({ ...prev, month: value === 'all' ? 'all' : parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2023, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={filters.year?.toString() || new Date().getFullYear().toString()}
                onValueChange={(value: string) =>
                  setFilters((prev) => ({ ...prev, year: value === 'all' ? 'all' : parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
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
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <Alert>
              <AlertDescription>
                No transactions found. Start by adding your first transaction!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: getCategoryColor(transaction.category_id) }}
                        ></div>
                        <h4 className="font-medium">{transaction.description}</h4>
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                          {transaction.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Category: {getCategoryName(transaction.category_id)}</p>
                        <p>Date: {transaction.transaction_date.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={`text-lg font-bold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(transaction)}
                        >
                          ✏️
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              🗑️
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this transaction? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(transaction.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
