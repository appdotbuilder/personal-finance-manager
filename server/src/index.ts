
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  registerUserInputSchema,
  loginUserInputSchema,
  createCategoryInputSchema,
  getUserCategoriesInputSchema,
  updateCategoryInputSchema,
  createTransactionInputSchema,
  getTransactionsInputSchema,
  updateTransactionInputSchema,
  getMonthlySummaryInputSchema,
  financialReportInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { createCategory } from './handlers/create_category';
import { getUserCategories } from './handlers/get_user_categories';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';
import { createTransaction } from './handlers/create_transaction';
import { getTransactions } from './handlers/get_transactions';
import { updateTransaction } from './handlers/update_transaction';
import { deleteTransaction } from './handlers/delete_transaction';
import { getMonthlySummary } from './handlers/get_monthly_summary';
import { getDashboardData } from './handlers/get_dashboard_data';
import { generateFinancialReport } from './handlers/generate_financial_report';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Category management routes
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getUserCategories: publicProcedure
    .input(getUserCategoriesInputSchema)
    .query(({ input }) => getUserCategories(input)),

  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),

  deleteCategory: publicProcedure
    .input(z.object({ id: z.number(), user_id: z.number() }))
    .mutation(({ input }) => deleteCategory(input)),

  // Transaction management routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactions: publicProcedure
    .input(getTransactionsInputSchema)
    .query(({ input }) => getTransactions(input)),

  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),

  deleteTransaction: publicProcedure
    .input(z.object({ id: z.number(), user_id: z.number() }))
    .mutation(({ input }) => deleteTransaction(input)),

  // Financial summary and reporting routes
  getMonthlySummary: publicProcedure
    .input(getMonthlySummaryInputSchema)
    .query(({ input }) => getMonthlySummary(input)),

  getDashboardData: publicProcedure
    .input(z.object({ user_id: z.number() }))
    .query(({ input }) => getDashboardData(input)),

  generateFinancialReport: publicProcedure
    .input(financialReportInputSchema)
    .mutation(({ input }) => generateFinancialReport(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Personal Finance Management TRPC server listening at port: ${port}`);
}

start();
