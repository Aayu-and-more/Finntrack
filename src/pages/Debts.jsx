import { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { HandCoins, CheckCircle2, Trash2 } from "lucide-react";

export function Debts({ debts, userId }) {
    const [showAdd, setShowAdd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        person: "",
        amount: "",
        direction: "owed_to_me",
        note: "",
        date: new Date().toISOString().slice(0, 10)
    });

    const active = debts.filter(d => !d.settled);
    const settled = debts.filter(d => d.settled);
    const totalOwed = active.filter(d => d.direction === "owed_to_me").reduce((s, d) => s + d.amount, 0);
    const totalIOwe = active.filter(d => d.direction === "i_owe").reduce((s, d) => s + d.amount, 0);
    const net = totalOwed - totalIOwe;

    const byPerson = {};
    active.forEach(d => {
        if (!byPerson[d.person]) byPerson[d.person] = { owed: 0, owing: 0, items: [] };
        if (d.direction === "owed_to_me") byPerson[d.person].owed += d.amount;
        else byPerson[d.person].owing += d.amount;
        byPerson[d.person].items.push(d);
    });

    const fmt = (n) =>
        (n < 0 ? "-" : "") + "€" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    const handleSubmit = async () => {
        if (!form.person || !form.amount) return;
        setLoading(true);
        try {
            const debtData = { ...form, amount: parseFloat(form.amount), settled: false, user_id: userId };
            await addDoc(collection(db, "debts"), debtData);
            setShowAdd(false);
            setForm({ person: "", amount: "", direction: "owed_to_me", note: "", date: new Date().toISOString().slice(0, 10) });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = async (id) => {
        await updateDoc(doc(db, "debts", id), { settled: true });
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(db, "debts", id));
    };

    return (
        <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto">
            <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text m-0">Debts & Splits</h2>
                    <p className="text-sm text-textMuted mt-1 mb-0">Track who owes whom</p>
                </div>
                <Button onClick={() => setShowAdd(true)} className="gap-2">
                    <HandCoins size={18} />
                    Add Debt
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-accentDim border-accent/20">
                    <p className="text-sm font-semibold text-accent m-0">Owed to you</p>
                    <p className="text-3xl font-bold text-accent mt-2 mb-0">{fmt(totalOwed)}</p>
                </Card>
                <Card className="bg-dangerDim border-danger/20">
                    <p className="text-sm font-semibold text-danger m-0">You owe</p>
                    <p className="text-3xl font-bold text-danger mt-2 mb-0">{fmt(totalIOwe)}</p>
                </Card>
                <Card>
                    <p className="text-sm font-semibold text-textMuted m-0">Net Balance</p>
                    <p className={`text-3xl font-bold mt-2 mb-0 ${net >= 0 ? "text-accent" : "text-danger"}`}>
                        {fmt(net)}
                    </p>
                </Card>
            </div>

            {/* Active Debts by Person */}
            <div className="space-y-4">
                {Object.entries(byPerson).map(([person, data]) => {
                    const personNet = data.owed - data.owing;
                    return (
                        <Card key={person} className="overflow-hidden p-0">
                            <div className="flex justify-between items-center p-5 bg-cardHover border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-accentDim text-accent flex items-center justify-center font-bold text-lg">
                                        {person.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-text m-0">{person}</h3>
                                        <p className="text-xs text-textMuted m-0 mt-0.5">{data.items.length} item{data.items.length > 1 ? "s" : ""}</p>
                                    </div>
                                </div>
                                <div className={`text-xl font-bold ${personNet >= 0 ? "text-accent" : "text-danger"}`}>
                                    {personNet >= 0 ? "+" : ""}{fmt(personNet)}
                                </div>
                            </div>

                            <div className="divide-y divide-border">
                                {data.items.map(d => (
                                    <div key={d.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-bg/50 transition-colors">
                                        <Badge className={d.direction === "owed_to_me" ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger"}>
                                            {d.direction === "owed_to_me" ? "owes you" : "you owe"}
                                        </Badge>
                                        <span className="flex-1 min-w-[120px] text-sm text-textMuted truncate">
                                            {d.note || "—"}
                                        </span>
                                        <span className="font-semibold text-text whitespace-nowrap">
                                            {fmt(d.amount)}
                                        </span>
                                        <div className="flex gap-2 shrink-0">
                                            <Button variant="secondary" size="sm" onClick={() => handleSettle(d.id)} className="gap-1.5 px-3">
                                                <CheckCircle2 size={14} /> Settle
                                            </Button>
                                            <button
                                                onClick={() => handleDelete(d.id)}
                                                className="text-textDim hover:text-danger hover:bg-dangerDim p-1.5 rounded-md transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {active.length === 0 && (
                <Card className="text-center py-12 border-dashed border-2">
                    <div className="w-16 h-16 mx-auto bg-bg rounded-full flex items-center justify-center mb-4">
                        <HandCoins size={32} className="text-textDim" />
                    </div>
                    <h3 className="text-lg font-semibold text-text mb-1">No Active Debts</h3>
                    <p className="text-sm text-textMuted m-0">You're completely settled up with everyone!</p>
                </Card>
            )}

            {/* Settled History */}
            {settled.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-sm font-semibold text-textMuted mb-3 px-2 uppercase tracking-wider">
                        Settled History ({settled.length})
                    </h3>
                    <Card className="p-0 overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
                        <div className="divide-y divide-border">
                            {settled.slice(0, 10).map(d => (
                                <div key={d.id} className="flex justify-between items-center p-3 px-4">
                                    <span className="text-sm text-textDim line-through decoration-textDim/50">
                                        {d.person} &mdash; {d.note || "—"}
                                    </span>
                                    <span className="text-sm text-textDim font-medium">
                                        {fmt(d.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Add Debt Modal */}
            <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Debt">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                        {[
                            { v: "owed_to_me", l: "They owe me" },
                            { v: "i_owe", l: "I owe them" }
                        ].map(o => {
                            const isActive = form.direction === o.v;
                            const isOwed = o.v === "owed_to_me";
                            return (
                                <button
                                    key={o.v}
                                    onClick={() => setForm(f => ({ ...f, direction: o.v }))}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all border ${isActive
                                            ? isOwed
                                                ? 'bg-accent/10 text-accent border-accent/30'
                                                : 'bg-danger/10 text-danger border-danger/30'
                                            : 'bg-bg text-textMuted border-border hover:bg-cardHover'
                                        }`}
                                >
                                    {o.l}
                                </button>
                            );
                        })}
                    </div>

                    <Input
                        label="Person"
                        placeholder="e.g., Alex"
                        value={form.person}
                        onChange={e => setForm(f => ({ ...f, person: e.target.value }))}
                    />
                    <Input
                        label="Amount (€)"
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    />
                    <Input
                        label="What is this for?"
                        placeholder="e.g., Dinner, Rent"
                        value={form.note}
                        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    />
                    <Input
                        label="Date"
                        type="date"
                        value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    />

                    <div className="flex gap-3 mt-2">
                        <Button variant="secondary" onClick={() => setShowAdd(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                            {loading ? "Adding..." : "Add Debt"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
