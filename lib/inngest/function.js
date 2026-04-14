import { inngest } from "./client";
import { db } from "@/lib/prisma";
import EmailTemplate from "@/emails/template";
import { sendEmail } from "@/actions/send-email";

export const checkBudgetAlerts = inngest.createFunction(
  {
    id: "check-budget-alerts",
    name: "Check Budget Alerts",
  },

  { cron: "0 */6 * * *" },// every 6 hours(testing)

  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: { isDefault: true },
              },
            },
          },
        },
      });
    });

    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];

      if (!defaultAccount) {
        console.log("❌ No default account");
        continue;
      }

      await step.run(`check-budget-${budget.id}`, async () => {
        const startDate = new Date();
        startDate.setDate(1);

        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id,
            type: "EXPENSE",
            date: {
              gte: startDate,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = Number(budget.amount);

        if (!budgetAmount) {
          console.log("❌ Budget amount missing");
          return;
        }

        const percentageUsed = (totalExpenses / budgetAmount) * 100;

        console.log("📊 USER:", budget.user.email);
        console.log("Expenses:", totalExpenses);
        console.log("Budget:", budgetAmount);
        console.log("Used %:", percentageUsed);

        // ✅ SIMPLE CONDITION (FIXED)
        if (percentageUsed >= 80) {
          console.log("✅ SENDING EMAIL...");

          await sendEmail({
            to: "veneelaearlapati@gmail.com",
            subject: `⚠️ Budget Alert (${defaultAccount.name})`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                budgetAmount: budgetAmount.toFixed(2),
                totalExpenses: totalExpenses.toFixed(2),
              },
            }),
          });

          // OPTIONAL: comment this if you want multiple emails
          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: new Date() },
          });
        } else {
          console.log("❌ Condition not met");
        }
      });
    }

    return { success: true };
  }
);