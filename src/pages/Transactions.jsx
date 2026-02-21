import { useState, useMemo } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { dateStr, PAYMENT_APPS } from "../lib/utils";
import { CATEGORIES } from "./Budgets";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Plus, Download, X, Search, FilterX, Trash2 } from "lucide-react";

export function Transactions({ transactions, userId }) {
    const [filter, setFilter] = useState({ type: "all", category: "all", app: "all", search: "" });
    const [showAdd, setShowAdd] = useState(false);
    const [showCSV, setShowCSV] = useState(false);
    const [csvText, setCsvText] = useState("");
    const [editTx, setEditTx] = useState(null);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        amount: "", type: "expense", category: "food",
        date: new Date().toISOString().slice(0, 10), app: "Revolut", note: "", recurring: false
    });

    const filtered = useMemo(() => {
        return transactions.filter(t =>
            (filter.type === "all" || t.type === filter.type) &&
            (filter.category === "all" || t.category === filter.category) &&
            (filter.app === "all" || t.app === filter.app) &&
            (filter.search === "" ||
                t.note?.toLowerCase().includes(filter.search.toLowerCase()) ||
                CATEGORIES.find(c => c.id === t.category)?.name.toLowerCase().includes(filter.search.toLowerCase())
            )
        ).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, filter]);

    const totalFiltered = filtered.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
    const fmt = (n) => "€" + Math.abs(n).toFixed(2);

    const handleSubmit = async () => {
        if (!form.amount || parseFloat(form.amount) <= 0) return;
        setLoading(true);
        try {
            const tx = { ...form, amount: parseFloat(form.amount), user_id: userId };
            if (editTx) {
                await updateDoc(doc(db, "transactions", editTx.id), tx);
            } else {
                await addDoc(collection(db, "transactions"), tx);
            }
            setShowAdd(false);
            setEditTx(null);
            setForm({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0, 10), app: "Revolut", note: "", recurring: false });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const deleteTransaction = async (id) => {
        await deleteDoc(doc(db, "transactions", id));
    };

    const handleCSVImport = async () => {
        setLoading(true);
        try {
            const lines = csvText.trim().split("\n");
            const imported = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
                if (cols.length >= 2) {
                    const amount = parseFloat(cols.find(c => !isNaN(parseFloat(c))) || "0");
                    const dateCol = cols.find(c => /\d{4}-\d{2}-\d{2}/.test(c)) || new Date().toISOString().slice(0, 10);
                    if (amount !== 0) {
                        imported.push({
                            amount: Math.abs(amount), type: "expense", category: "other",
                            date: dateCol, app: "CSV Import", note: cols[0] || "", recurring: false, user_id: userId
                        });
                    }
                }
            }

            if (imported.length > 0) {
                const batch = writeBatch(db);
                imported.forEach(item => {
                    const docRef = doc(collection(db, "transactions"));
                    batch.set(docRef, item);
                });
                await batch.commit();

                setShowCSV(false);
                setCsvText("");
                alert(`Successfully imported ${imported.length} transactions!`);
            }
        } catch (err) {
            console.error(err);
            alert("Error parsing CSV. Please check the format.");
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (t) => {
        setEditTx(t);
        setForm({ ...t, amount: String(t.amount) });
        setShowAdd(true);
    };

    const hasActiveFilters = filter.type !== "all" || filter.category !== "all" || filter.app !== "all" || filter.search !== "";

    return (
        <div className="flex flex-col gap-5 w-full max-w-5xl mx-auto">
            <div className="flex justify-between items-center flex-wrap gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text m-0">Transactions</h2>
                    <p className="text-sm text-textMuted mt-1 mb-0">
                        {filtered.length} transactions &middot; Net: <span className={`font-semibold ${totalFiltered >= 0 ? "text-accent" : "text-danger"}`}>{totalFiltered >= 0 ? "+" : "-"}{fmt(totalFiltered)}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setShowCSV(true)} className="gap-2 shrink-0 hidden sm:flex">
                        <Download size={16} /> Import CSV
                    </Button>
                    <Button onClick={() => {
                        setEditTx(null);
                        setForm({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0, 10), app: "Revolut", note: "", recurring: false });
                        setShowAdd(true);
                    }} className="gap-2 shrink-0">
                        <Plus size={16} /> Add
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="flex flex-col sm:flex-row gap-3 p-4 items-end">
                <div className="w-full sm:w-auto relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textDim" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={filter.search}
                        onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                        className="w-full sm:w-48 bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text outline-none focus:border-accent"
                    />
                </div>

                <Select
                    value={filter.type}
                    onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}
                    options={[
                        { value: "all", label: "All Types" },
                        { value: "income", label: "Income" },
                        { value: "expense", label: "Expense" }
                    ]}
                />

                <Select
                    value={filter.category}
                    onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
                    options={[
                        { value: "all", label: "All Categories" },
                        ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
                    ]}
                />

                <Select
                    value={filter.app}
                    onChange={e => setFilter(f => ({ ...f, app: e.target.value }))}
                    options={[
                        { value: "all", label: "All Apps" },
                        ...PAYMENT_APPS.map(a => ({ value: a, label: a }))
                    ]}
                />

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        onClick={() => setFilter({ type: "all", category: "all", app: "all", search: "" })}
                        className="px-3 shrink-0"
                        title="Clear filters"
                    >
                        <FilterX size={18} />
                    </Button>
                )}
            </Card>

            {/* Transactions List */}
            <Card className="p-0 overflow-hidden divide-y divide-border">
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Search size={32} className="mx-auto text-border mb-3" />
                        <p className="text-textDim m-0">No transactions found matching your filters</p>
                    </div>
                ) : (
                    filtered.map(t => {
                        const cat = CATEGORIES.find(c => c.id === t.category);
                        return (
                            <div
                                key={t.id}
                                onClick={() => openEdit(t)}
                                className="flex items-center gap-4 p-4 hover:bg-cardHover cursor-pointer transition-colors group"
                            >
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
                                        {t.recurring && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                <span className="text-info flex items-center gap-1"><RefreshCw size={10} /> Recurring</span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className={`text-sm font-bold whitespace-nowrap ${t.type === "income" ? "text-accent" : "text-text"}`}>
                                        {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                                    </span>
                                    <button
                                        onClick={e => { e.stopPropagation(); deleteTransaction(t.id); }}
                                        className="p-1.5 text-textMuted hover:text-danger hover:bg-dangerDim rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </Card>

            {/* Add/Edit Modal */}
            <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditTx(null); }} title={editTx ? "Edit Transaction" : "Add Transaction"}>
                <div className="flex flex-col gap-4">
                    {/* Toggle Income/Expense */}
                    <div className="flex gap-2">
                        {["expense", "income"].map(type => {
                            const isActive = form.type === type;
                            const isExpense = type === "expense";
                            return (
                                <button
                                    key={type}
                                    onClick={() => setForm(f => ({ ...f, type }))}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all border ${isActive
                                            ? isExpense
                                                ? 'bg-danger/10 text-danger border-danger/30'
                                                : 'bg-accent/10 text-accent border-accent/30'
                                            : 'bg-bg text-textMuted border-border hover:bg-cardHover'
                                        }`}
                                >
                                    {isExpense ? "↑ Expense" : "↓ Income"}
                                </button>
                            );
                        })}
                    </div>

                    <Input
                        label="Amount (€)"
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    />

                    <Select
                        label="Category"
                        value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        options={CATEGORIES
                            .filter(c => form.type === "income" ? ["income", "other"].includes(c.id) : !["income", "transfer"].includes(c.id))
                            .map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
                        }
                    />

                    <Input
                        label="Date"
                        type="date"
                        value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    />

                    <Select
                        label="Payment App"
                        value={form.app}
                        onChange={e => setForm(f => ({ ...f, app: e.target.value }))}
                        options={PAYMENT_APPS.map(a => ({ value: a, label: a }))}
                    />

                    <Input
                        label="Note (Optional)"
                        placeholder="e.g., Lunch with friends"
                        value={form.note}
                        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    />

                    <label className="flex items-center gap-2 text-sm text-textMuted cursor-pointer mt-1 select-none">
                        <input
                            type="checkbox"
                            checked={form.recurring}
                            onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
                            className="w-4 h-4 rounded text-accent bg-bg border-border focus:ring-accent"
                        />
                        Mark as deeply recurring monthly
                    </label>

                    <div className="flex gap-3 mt-2">
                        <Button variant="secondary" onClick={() => { setShowAdd(false); setEditTx(null); }} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                            {loading ? "Saving..." : editTx ? "Save Changes" : "Save Transaction"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Import CSV Modal */}
            <Modal open={showCSV} onClose={() => setShowCSV(false)} title="Import CSV" width="max-w-xl">
                <div className="flex flex-col gap-4">
                    <p className="m-0 text-sm text-textMuted leading-relaxed">
                        Paste your bank CSV export. We will try our best to auto-detect amounts & dates.
                        Format expects: <code>Date, Description, Amount</code>.
                    </p>
                    <textarea
                        rows={10}
                        value={csvText}
                        onChange={e => setCsvText(e.target.value)}
                        placeholder={`Date,Description,Amount\n2024-01-15,"Target Run",-45.50`}
                        className="w-full bg-bg border border-border rounded-lg p-3 text-sm text-text font-mono resize-y outline-none focus:border-accent"
                    />
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setShowCSV(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleCSVImport} disabled={loading || !csvText.trim()} className="flex-1">
                            {loading ? "Importing..." : "Process Import"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
