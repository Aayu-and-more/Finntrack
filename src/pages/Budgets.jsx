import { useState } from "react";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getMonthKey } from "../lib/utils";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Target, X, Plus } from "lucide-react";

export const CATEGORIES = [
    { id: "food", name: "Food & Dining", icon: "🍽️", color: "#FF7043" },
    { id: "transport", name: "Transport", icon: "🚗", color: "#42A5F5" },
    { id: "shopping", name: "Shopping", icon: "🛍️", color: "#AB47BC" },
    { id: "bills", name: "Bills & Utilities", icon: "⚡", color: "#FFB74D" },
    { id: "entertainment", name: "Entertainment", icon: "🎬", color: "#EC407A" },
    { id: "health", name: "Health", icon: "💊", color: "#66BB6A" },
    { id: "groceries", name: "Groceries", icon: "🛒", color: "#26A69A" },
    { id: "rent", name: "Rent", icon: "🏠", color: "#5C6BC0" },
    { id: "education", name: "Education", icon: "📚", color: "#8D6E63" },
    { id: "subscriptions", name: "Subscriptions", icon: "🔄", color: "#78909C" },
    { id: "travel", name: "Travel", icon: "✈️", color: "#29B6F6" },
    { id: "income", name: "Income", icon: "💰", color: "#22D3A7" },
    { id: "transfer", name: "Transfer", icon: "🔄", color: "#90A4AE" },
    { id: "other", name: "Other", icon: "📦", color: "#BDBDBD" },
];

export function Budgets({ budgets, transactions, currentMonth, userId }) {
    const [showAdd, setShowAdd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ category: "food", limit: "" });

    // Calculate spending per category for the current month
    const byCat = {};
    transactions
        .filter(t => getMonthKey(t.date) === currentMonth && t.type === "expense")
        .forEach(t => {
            byCat[t.category] = (byCat[t.category] || 0) + t.amount;
        });

    const existingCats = budgets.map(b => b.category);
    const availableCats = CATEGORIES.filter(
        c => !["income", "transfer"].includes(c.id) && !existingCats.includes(c.id)
    );

    const fmt = (n) => "€" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    const handleSubmit = async () => {
        if (!form.limit) return;
        setLoading(true);
        try {
            const budgetData = {
                ...form,
                limit: parseFloat(form.limit),
                period: "monthly",
                user_id: userId
            };
            await addDoc(collection(db, "budgets"), budgetData);
            setShowAdd(false);
            setForm({ category: availableCats[0]?.id || "food", limit: "" });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(db, "budgets", id));
    };

    // Prevent form open if no available categories
    const handleOpenAdd = () => {
        if (availableCats.length === 0) return;
        if (!availableCats.find(c => c.id === form.category)) {
            setForm(f => ({ ...f, category: availableCats[0].id }));
        }
        setShowAdd(true);
    };

    return (
        <div className="flex flex-col gap-5 w-full">
            <div className="flex justify-between items-center flex-wrap gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text m-0">Budgets</h2>
                    <p className="text-sm text-textMuted mt-1 mb-0">Monthly spending limits</p>
                </div>
                <Button
                    onClick={handleOpenAdd}
                    disabled={availableCats.length === 0}
                    className="gap-2"
                >
                    <Plus size={18} />
                    Add Budget
                </Button>
            </div>

            {budgets.length === 0 && (
                <Card className="text-center py-16 border-dashed border-2">
                    <div className="w-16 h-16 mx-auto bg-bg rounded-full flex items-center justify-center mb-4">
                        <Target size={32} className="text-textDim" />
                    </div>
                    <h3 className="text-lg font-semibold text-text mb-1">No Budgets Set</h3>
                    <p className="text-sm text-textMuted mb-6">Create budgets to track and limit your spending.</p>
                    <Button onClick={handleOpenAdd}>Create your first budget</Button>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {budgets.map(b => {
                    const cat = CATEGORIES.find(c => c.id === b.category);
                    const spent = byCat[b.category] || 0;
                    const percentage = Math.min((spent / b.limit) * 100, 100);
                    const remaining = b.limit - spent;

                    let statusColor = "bg-accent";
                    let textColor = "text-accent";
                    if (percentage > 90) {
                        statusColor = "bg-danger";
                        textColor = "text-danger";
                    } else if (percentage > 75) {
                        statusColor = "bg-warning";
                        textColor = "text-warning";
                    }

                    return (
                        <Card key={b.id} className="relative group overflow-hidden">
                            {/* Delete Button (appears on hover) */}
                            <button
                                onClick={() => handleDelete(b.id)}
                                className="absolute top-3 right-3 p-1.5 text-textDim hover:text-danger hover:bg-dangerDim rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto"
                            >
                                <X size={16} />
                            </button>

                            <div className="flex items-center gap-3 mb-5">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                                    style={{ backgroundColor: `${cat?.color || '#888'}1A` }}
                                >
                                    {cat?.icon}
                                </div>
                                <h3 className="m-0 font-semibold text-text text-base">{cat?.name}</h3>
                            </div>

                            <div className="flex justify-between items-end mb-2">
                                <span className={`text-2xl font-bold ${textColor}`}>
                                    {fmt(spent)}
                                </span>
                                <span className="text-sm font-medium text-textMuted mb-1">
                                    of {fmt(b.limit)}
                                </span>
                            </div>

                            {/* Progress Bar Container */}
                            <div className="h-2 w-full bg-bg rounded-full overflow-hidden mb-3">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${statusColor}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            <p className={`m-0 text-xs font-medium ${remaining >= 0 ? "text-textMuted" : "text-danger"}`}>
                                {remaining >= 0
                                    ? `${fmt(remaining)} remaining`
                                    : `${fmt(Math.abs(remaining))} over budget!`}
                            </p>
                        </Card>
                    );
                })}
            </div>

            <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Budget">
                <div className="flex flex-col gap-4">
                    <Select
                        label="Category"
                        value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        options={availableCats.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
                    />
                    <Input
                        label="Monthly Limit (€)"
                        type="number"
                        placeholder="e.g., 200"
                        value={form.limit}
                        onChange={e => setForm(f => ({ ...f, limit: e.target.value }))}
                    />

                    <div className="flex gap-3 mt-2">
                        <Button variant="secondary" onClick={() => setShowAdd(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                            {loading ? "Saving..." : "Add Budget"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
