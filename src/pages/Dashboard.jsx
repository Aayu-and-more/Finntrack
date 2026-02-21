import { useState, useMemo } from "react";
import { parseISO, isAfter, isBefore, startOfMonth, subMonths, endOfMonth, subDays, startOfYear, endOfDay } from "date-fns";
import { MONTHS, getMonthKey, dateStr } from "../lib/utils";
import { CATEGORIES } from "./Budgets";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { StatCard } from "../components/charts/StatCard";
import { DonutChart } from "../components/charts/DonutChart";
import { SparkBar } from "../components/charts/SparkBar";
import { ArrowDownRight, ArrowUpRight, Target, Wallet, ArrowRight } from "lucide-react";

export function Dashboard({ transactions, budgets, debts, savingsPots, setPage }) {
    const [dateRange, setDateRange] = useState("this_month"); // this_month, last_month, last_30, ytd, all_time
    const now = new Date();

    // Filter Transactions by Date Range
    const filteredTx = useMemo(() => {
        let start, end = endOfDay(now);

        switch (dateRange) {
            case "this_month":
                start = startOfMonth(now);
                break;
            case "last_month":
                start = startOfMonth(subMonths(now, 1));
                end = endOfMonth(subMonths(now, 1));
                break;
            case "last_30":
                start = subDays(now, 30);
                break;
            case "ytd":
                start = startOfYear(now);
                break;
            case "all_time":
            default:
                start = new Date(2000, 0, 1);
                break;
        }

        return transactions.filter(t => {
            const d = parseISO(t.date);
            return isAfter(d, start) && isBefore(d, end);
        });
    }, [transactions, dateRange]);

    const income = filteredTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = filteredTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : "0.0";

    const fmt = (n) => "€" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Chart 1: Donut (Expenses by category)
    const byCat = {};
    filteredTx.filter(t => t.type === "expense").forEach(t => {
        byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
    const catData = Object.entries(byCat)
        .map(([id, val]) => ({ ...CATEGORIES.find(c => c.id === id), value: val }))
        .sort((a, b) => b.value - a.value);

    // Chart 2: SparkBar (6-month spending trend, relative to 'now' so it's consistent)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const key = getMonthKey(d.toISOString());
        const exp = transactions
            .filter(t => t.type === "expense" && getMonthKey(t.date) === key)
            .reduce((s, t) => s + t.amount, 0);
        trend.push({ label: MONTHS[d.getMonth()], value: exp, highlight: i === 0 });
    }

    // Mini Widgets Summary Data
    const budgetStatus = budgets.map(b => {
        // Budget is naturally a monthly concept, so we show it against 'this month' regardless of filter unless we want to complicate it
        const spentThisMonth = transactions
            .filter(t => t.type === "expense" && t.category === b.category && getMonthKey(t.date) === getMonthKey(now.toISOString()))
            .reduce((s, t) => s + t.amount, 0);
        const pct = Math.min((spentThisMonth / b.limit) * 100, 100);
        return { ...b, spent: spentThisMonth, pct, cat: CATEGORIES.find(c => c.id === b.category) };
    }).sort((a, b) => b.pct - a.pct); // Highest utilized first

    const totalOwed = debts.filter(d => d.direction === "owed_to_me" && !d.settled).reduce((s, d) => s + d.amount, 0);
    const totalIOwe = debts.filter(d => d.direction === "i_owe" && !d.settled).reduce((s, d) => s + d.amount, 0);

    return (
        <div className="flex flex-col gap-6 w-full fade-in">

            {/* Header & Date Range */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-transparent mb-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text m-0">Dashboard</h2>
                    <p className="text-sm text-textMuted mt-1 mb-0">Your financial overview</p>
                </div>
                <div className="w-full md:w-56">
                    <Select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        options={[
                            { value: "this_month", label: "This Month" },
                            { value: "last_month", label: "Last Month" },
                            { value: "last_30", label: "Last 30 Days" },
                            { value: "ytd", label: "Year to Date" },
                            { value: "all_time", label: "All Time" }
                        ]}
                    />
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                <StatCard label="Income" value={fmt(income)} colorClass="text-accent" bgClass="bg-accent/10" icon={ArrowDownRight} />
                <StatCard label="Expenses" value={fmt(expenses)} colorClass="text-danger" bgClass="bg-danger/10" icon={ArrowUpRight} />
                <StatCard label="Savings" value={fmt(savings)} colorClass={savings >= 0 ? "text-accent" : "text-danger"} bgClass={savings >= 0 ? "bg-accent/10" : "bg-danger/10"} icon={Wallet} />
                <StatCard label="Savings Rate" value={`${savingsRate}%`} colorClass={parseFloat(savingsRate) >= 20 ? "text-accent" : "text-warning"} bgClass={parseFloat(savingsRate) >= 20 ? "bg-accent/10" : "bg-warning/10"} icon={Target} />
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="flex flex-col">
                    <p className="font-semibold text-text text-sm m-0 mb-6">6-Month Spending Trend</p>
                    <div className="mt-auto pl-2">
                        <SparkBar data={trend} height={120} />
                    </div>
                </Card>

                <Card className="flex items-center gap-6">
                    <div className="relative shrink-0 w-36 h-36 flex items-center justify-center">
                        {catData.length > 0 ? (
                            <DonutChart segments={catData} size={144} />
                        ) : (
                            <div className="w-24 h-24 rounded-full border-4 border-dashed border-border" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text text-sm m-0 mb-4">Spending by Category</p>
                        <div className="space-y-3">
                            {catData.slice(0, 4).map(c => (
                                <div key={c.id} className="flex justify-between items-center group">
                                    <div className="flex items-center gap-2 truncate pr-3">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: c.color }}
                                        />
                                        <span className="text-xs text-textMuted truncate">{c.icon} {c.name}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-text whitespace-nowrap">{fmt(c.value)}</span>
                                </div>
                            ))}
                            {catData.length === 0 && (
                                <p className="text-xs text-textDim m-0">No expenses in this period.</p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Three Column Mini-Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Budgets */}
                <Card className="flex flex-col">
                    <div className="flex justify-between items-center mb-5">
                        <p className="font-semibold text-text text-sm m-0">Budgets (Current Month)</p>
                        <button onClick={() => setPage("budgets")} className="text-textMuted hover:text-accent transition-colors"><ArrowRight size={16} /></button>
                    </div>
                    <div className="space-y-4">
                        {budgetStatus.length === 0 && <p className="text-xs text-textDim my-4">No budgets set.</p>}
                        {budgetStatus.slice(0, 4).map(b => {
                            const statusColor = b.pct > 90 ? "bg-danger" : b.pct > 75 ? "bg-warning" : "bg-accent";
                            return (
                                <div key={b.id}>
                                    <div className="flex justify-between mb-1.5">
                                        <span className="text-xs text-textMuted truncate pr-2">{b.cat?.icon} {b.cat?.name}</span>
                                        <span className="text-[11px] font-medium text-text">{fmt(b.spent)} / {fmt(b.limit)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-bg rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${statusColor}`} style={{ width: `${b.pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Savings */}
                <Card className="flex flex-col">
                    <div className="flex justify-between items-center mb-5">
                        <p className="font-semibold text-text text-sm m-0">Savings Pots</p>
                        <button onClick={() => setPage("savings")} className="text-textMuted hover:text-accent transition-colors"><ArrowRight size={16} /></button>
                    </div>
                    <div className="space-y-4">
                        {savingsPots.length === 0 && <p className="text-xs text-textDim my-4">No savings pots set up.</p>}
                        {savingsPots.slice(0, 4).map(pot => {
                            const t = pot.contributions.reduce((s, c) => s + c.amount, 0);
                            const p = pot.target > 0 ? Math.min((t / pot.target) * 100, 100) : 0;
                            return (
                                <div key={pot.id}>
                                    <div className="flex justify-between mb-1.5">
                                        <span className="text-xs text-textMuted truncate pr-2">{pot.icon} {pot.name}</span>
                                        <span className="text-[11px] font-medium text-accent">{fmt(t)} / {fmt(pot.target)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-bg rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: pot.color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Debts */}
                <Card className="flex flex-col bg-bg border-none">
                    <div className="flex justify-between items-center mb-4 px-1">
                        <p className="font-semibold text-text text-sm m-0">Active Debts</p>
                        <button onClick={() => setPage("debts")} className="text-textMuted hover:text-accent transition-colors"><ArrowRight size={16} /></button>
                    </div>
                    <div className="flex gap-3 mb-4">
                        <div className="flex-1 p-3 rounded-xl bg-accent/10 border border-accent/20">
                            <p className="text-[10px] uppercase font-bold text-accent mb-1 tracking-wider">Owed to me</p>
                            <p className="text-lg font-bold text-accent m-0">{fmt(totalOwed)}</p>
                        </div>
                        <div className="flex-1 p-3 rounded-xl bg-danger/10 border border-danger/20">
                            <p className="text-[10px] uppercase font-bold text-danger mb-1 tracking-wider">I owe</p>
                            <p className="text-lg font-bold text-danger m-0">{fmt(totalIOwe)}</p>
                        </div>
                    </div>
                    <div className="divide-y divide-border px-1">
                        {debts.filter(d => !d.settled).slice(0, 3).map(d => (
                            <div key={d.id} className="flex justify-between items-center py-2">
                                <span className="text-xs text-textMuted truncate pr-2">{d.person}</span>
                                <span className={`text-xs font-semibold ${d.direction === "owed_to_me" ? "text-accent" : "text-danger"}`}>
                                    {d.direction === "owed_to_me" ? "+" : "-"}{fmt(d.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

            </div>

            {/* Recent Transactions List */}
            <Card>
                <div className="flex justify-between items-center mb-5">
                    <p className="font-semibold text-text text-sm m-0">Recent Transactions</p>
                    <button onClick={() => setPage("transactions")} className="text-textMuted hover:text-accent transition-colors flex items-center gap-1 text-sm">
                        View all <ArrowRight size={16} />
                    </button>
                </div>
                <div className="divide-y divide-border">
                    {filteredTx.length === 0 && <p className="text-sm text-textDim py-4 text-center">No recent transactions.</p>}
                    {filteredTx.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6).map(t => {
                        const cat = CATEGORIES.find(c => c.id === t.category);
                        return (
                            <div key={t.id} className="flex items-center gap-4 py-3 group cursor-pointer" onClick={() => setPage("transactions")}>
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                                    style={{ backgroundColor: `${cat?.color || '#888'}1A` }}
                                >
                                    {cat?.icon || "📦"}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="m-0 text-sm font-semibold text-text truncate">
                                        {cat?.name}{t.note ? ` — ${t.note}` : ""}
                                    </p>
                                    <p className="m-0 mt-0.5 text-xs text-textDim flex items-center gap-1.5">
                                        <span>{dateStr(t.date)}</span>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <span>{t.app}</span>
                                    </p>
                                </div>

                                <span className={`text-sm font-bold whitespace-nowrap ${t.type === "income" ? "text-accent" : "text-text"}`}>
                                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </Card>

        </div>
    );
}
