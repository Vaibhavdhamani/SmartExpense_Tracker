/**
 * useSalary.js
 *
 * Single source of truth for salary-based calculations across the app.
 *
 * Usage:
 *   const { hasSalary, salary, getSavingsInfo, getBudgetSalaryPct } = useSalary();
 *
 * Rules:
 *   - Salary is always stored in INR in the database
 *   - If no salary is set (0), hasSalary = false → all salary UI is hidden
 *   - getSavingsInfo(spent)  → savings amount, %, over/under status
 *   - getBudgetSalaryPct(budgeted) → what % of salary is budgeted
 */

import { useAuth }     from '../context/AuthContext';
import { useCurrency } from './useCurrency';

export function useSalary() {
  const { user }        = useAuth();
  const { format }      = useCurrency();

  const salary    = user?.settings?.monthlySalary || 0;
  const hasSalary = salary > 0;

  /**
   * getSavingsInfo(totalSpentINR)
   * Returns savings breakdown based on total spending vs salary.
   * All amounts are in INR (display via useCurrency format).
   *
   * @param {number} totalSpentINR - total spending in INR
   * @returns {object|null} - null if no salary set
   */
  const getSavingsInfo = (totalSpentINR = 0) => {
    if (!hasSalary) return null;

    const saved     = salary - totalSpentINR;
    const savedPct  = salary > 0 ? Math.round((Math.abs(saved) / salary) * 100) : 0;
    const spentPct  = salary > 0 ? Math.round((totalSpentINR / salary) * 100)   : 0;
    const isOver    = saved < 0;

    return {
      saved,
      savedPct,
      spentPct,
      isOver,
      formattedSalary: format(salary),
      formattedSaved:  format(Math.abs(saved)),
      formattedSpent:  format(totalSpentINR),
      label: isOver
        ? `${savedPct}% over salary ⚠️`
        : `${savedPct}% of salary saved ✅`,
      color: isOver ? 'danger' : savedPct >= 20 ? 'success' : 'warning',
    };
  };

  /**
   * getBudgetSalaryPct(totalBudgetedINR)
   * Returns what % of salary is covered by budgets.
   *
   * @param {number} totalBudgetedINR
   * @returns {number|null}
   */
  const getBudgetSalaryPct = (totalBudgetedINR = 0) => {
    if (!hasSalary || totalBudgetedINR === 0) return null;
    return Math.round((totalBudgetedINR / salary) * 100);
  };

  return {
    salary,
    hasSalary,
    format,
    getSavingsInfo,
    getBudgetSalaryPct,
  };
}