import { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getMonthKey, dateStr, MONTHS } from "../lib/utils";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { SparkBar } from "../components/charts/SparkBar";
import { StatCard } from "../components/charts/StatCard";
import { PiggyBank, CalendarRange, RefreshCw, Target, Plus, History, Pencil, Trash2 } from "lucide-react";

const POT_ICONS = ["🏦", "🛡️", "📈", "✈️", "🏠", "🎓", "💍", "🚗", "👶", "💻", "🎯", "💎"];
const POT_COLORS = [
    "#22D3A7", "#42A5F5", "#FFB74D", "#AB47BC",
    "#EC407A", "#66BB6A", "#5C6BC0", "#EF5350"
];

export function Savings({ savingsPots, userId }) {
    const [showAddPot, setShowAddPot] = useState(false);
    const [showAddContrib, setShowAddContrib] = useState(null); // potId
    const [showHistory, setShowHistory] = useState(null); // potId
    const [editPot, setEditPot] = useState(null);
    const [loading, setLoading] = useState(false);

    const [potForm, setPotForm] = useState({
        name: "", icon: "🏦", target: "", color: "#22D3A7", monthlyAmount: ""
    });

    const [contribForm, setContribForm] = useState({
        amount: "", date: new Date().toISOString().slice(0, 10), note: ""
    });

    const totalSaved = savingsPots.reduce((s, p) =>
        s + p.contributions.reduce((ss, c) => ss + c.amount, 0), 0
    );

    const totalTargets = savingsPots.reduce((s, p) => s + (p.target || 0), 0);
    const totalMonthly = savingsPots.reduce((s, p) => s + (p.monthlyAmount || 0), 0);

    const thisMonthKey = getMonthKey(new Date().toISOString());
    const thisMonthContribs = savingsPots.reduce((s, p) =>
        s + p.contributions
            .filter(c => getMonthKey(c.date) === thisMonthKey)
            .reduce((ss, c) => ss + c.amount, 0),
        0
    );

    const now = new Date();
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = getMonthKey(d.toISOString());
        const val = savingsPots.reduce((s, p) =>
            s + p.contributions
                .filter(c => getMonthKey(c.date) === key)
                .reduce((ss, c) => ss + c.amount, 0),
            0
        );
        monthlyTrend.push({
            label: MONTHS[d.getMonth()],
            value: val,
            highlight: i === 0
        });
    }

    const fmt = (n) => "€" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const fmtShort = (n) => n >= 1000 ? "€" + (n / 1000).toFixed(1) + "k" : "€" + Math.round(n);

    const handleAddPot = async () => {
        if (!potForm.name || !potForm.target) return;
        setLoading(true);

        try {
            const potData = {
                name: potForm.name,
                icon: potForm.icon,
                target: parseFloat(potForm.target),
                color: potForm.color,
                monthly_amount: parseFloat(potForm.monthlyAmount) || 0,
                user_id: userId
            };

            if (editPot) {
                await updateDoc(doc(db, "savings_pots", editPot.id), potData);
            } else {
                await addDoc(collection(db, "savings_pots"), potData);
            }

            setShowAddPot(false);
            setEditPot(null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddContrib = async () => {
        if (!contribForm.amount || !showAddContrib) return;
        setLoading(true);

        try {
            const contribData = {
                pot_id: showAddContrib,
                amount: parseFloat(contribForm.amount),
                date: contribForm.date,
                note: contribForm.note,
                user_id: userId
            };

            await addDoc(collection(db, "savings_contributions"), contribData);
            setShowAddContrib(null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePot = async (id) => {
        await deleteDoc(doc(db, "savings_pots", id));
    };

    const handleDeleteContrib = async (id) => {
        await deleteDoc(doc(db, "savings_contributions", id));
    };

    const openEdit = (pot) => {
        setEditPot(pot);
        setPotForm({
            name: pot.name,
            icon: pot.icon,
            target: String(pot.target),
            color: pot.color,
            monthlyAmount: String(pot.monthlyAmount || "")
        });
        setShowAddPot(true);
    };

    const progressPct = totalTargets > 0 ? ((totalSaved / totalTargets) * 100).toFixed(1) : "0.0";

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex justify-between items-center flex-wrap gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-text m-0">Savings & Investments</h2>
                    <p className="text-sm text-textMuted mt-1 mb-0">Pay yourself first</p>
                </div>
                <Button
                    onClick={() => {
                        setEditPot(null);
                        setPotForm({ name: "", icon: "🏦", target: "", color: "#22D3A7", monthlyAmount: "" });
                        setShowAddPot(true);
                    }}
                    className="gap-2"
                >
                    <Plus size={18} />
                    New Pot
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Saved" value={fmt(totalSaved)} colorClass="text-accent" bgClass="bg-accent/10" icon={PiggyBank} />
                <StatCard label="This Month" value={fmt(thisMonthContribs)} colorClass="text-info" bgClass="bg-info/10" icon={CalendarRange} />
                <StatCard label="Monthly Commitment" value={fmt(totalMonthly)} colorClass="text-purple" bgClass="bg-purple/10" icon={RefreshCw} />
                <StatCard label="Progress" value={`${progressPct}%`} colorClass="text-warning" bgClass="bg-warning/10" icon={Target} />
            </div>

            <Card className="p-5">
                <p className="font-semibold text-text text-sm m-0 mb-6">6-Month Contribution Trend</p>
                <SparkBar data={monthlyTrend} height={80} />
            </Card>

            {savingsPots.length === 0 && (
                <Card className="text-center py-16 border-dashed border-2">
                    <div className="w-16 h-16 mx-auto bg-bg rounded-full flex items-center justify-center mb-4">
                        <PiggyBank size={32} className="text-textDim" />
                    </div>
                    <h3 className="text-lg font-semibold text-text mb-1">No Savings Pots Setup</h3>
                    <p className="text-sm text-textMuted mb-6">Create a savings pot to start tracking your goals.</p>
                    <Button onClick={() => setShowAddPot(true)}>Create a Pot</Button>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {savingsPots.map(pot => {
                    const potTotal = pot.contributions.reduce((s, c) => s + c.amount, 0);
                    const pct = pot.target > 0 ? Math.min((potTotal / pot.target) * 100, 100) : 0;
                    const remaining = pot.target - potTotal;
                    const monthsToGoal = pot.monthlyAmount > 0 && remaining > 0 ? Math.ceil(remaining / pot.monthlyAmount) : null;
                    const thisMonthPot = pot.contributions.filter(c => getMonthKey(c.date) === thisMonthKey).reduce((s, c) => s + c.amount, 0);
                    const monthlyHit = pot.monthlyAmount > 0 && thisMonthPot >= pot.monthlyAmount;

                    return (
                        <Card key={pot.id} className="relative overflow-hidden group border-t-4" style={{ borderTopColor: pot.color }}>
                            <div className="flex justify-between items-start mb-5">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                                        style={{ backgroundColor: `${pot.color}1A` }}
                                    >
                                        {pot.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-text m-0">{pot.name}</h3>
                                        {pot.monthlyAmount > 0 && (
                                            <p className={`text-xs m-0 mt-0.5 font-medium ${monthlyHit ? 'text-accent' : 'text-warning'}`}>
                                                {monthlyHit ? "✓ target met" : `${fmt(pot.monthlyAmount - thisMonthPot)} left this month`}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(pot)} className="p-1.5 text-textDim hover:text-info hover:bg-info/10 rounded">
                                        <Pencil size={15} />
                                    </button>
                                    <button onClick={() => handleDeletePot(pot.id)} className="p-1.5 text-textDim hover:text-danger hover:bg-danger/10 rounded">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-baseline mb-2">
                                <span className="text-2xl font-bold" style={{ color: pot.color }}>
                                    {fmt(potTotal)}
                                </span>
                                <span className="text-sm text-textMuted font-medium">
                                    of {fmt(pot.target)}
                                </span>
                            </div>

                            <div className="h-2 w-full bg-bg rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${pct}%`, backgroundColor: pot.color }}
                                />
                            </div>

                            <div className="flex justify-between mb-4">
                                <span className="text-xs font-medium text-textDim">{pct.toFixed(1)}%</span>
                                {monthsToGoal && (
                                    <span className="text-xs font-medium text-textDim">~{monthsToGoal}mo to goal</span>
                                )}
                            </div>

                            {pot.contributions.length > 0 && (
                                <div className="mb-4 space-y-1.5 opacity-70 hover:opacity-100 transition-opacity">
                                    {pot.contributions.slice(-2).reverse().map(c => (
                                        <div key={c.id} className="flex justify-between items-center py-0.5">
                                            <span className="text-xs text-textDim">{dateStr(c.date)}</span>
                                            <span className="text-xs font-bold text-accent">+{fmt(c.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2 mt-auto pt-2 border-t border-border">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setShowAddContrib(pot.id);
                                        setContribForm({
                                            amount: String(pot.monthlyAmount || ""),
                                            date: new Date().toISOString().slice(0, 10),
                                            note: ""
                                        });
                                    }}
                                    className="flex-1 text-xs h-8 bg-cardHover"
                                >
                                    <Plus size={14} className="mr-1" /> Add
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowHistory(pot.id)}
                                    className="flex-1 text-xs h-8 bg-cardHover"
                                >
                                    <History size={14} className="mr-1" /> History
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {savingsPots.length > 0 && totalMonthly > 0 && (
                <Card className="p-5">
                    <p className="font-semibold text-text text-sm m-0 mb-4">Projected Growth</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[3, 6, 12, 24].map(m => (
                            <div key={m} className="p-3 bg-bg rounded-xl border border-border text-center">
                                <p className="text-xs font-medium text-textDim m-0">{m} months</p>
                                <p className="text-lg font-bold text-accent mt-1 mb-0">
                                    {fmtShort(totalSaved + totalMonthly * m)}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Edit/Add Pot Modal */}
            <Modal open={showAddPot} onClose={() => { setShowAddPot(false); setEditPot(null); }} title={editPot ? "Edit Pot" : "New Savings Pot"}>
                <div className="flex flex-col gap-5">
                    <Input
                        label="Name"
                        placeholder="e.g., Emergency Fund"
                        value={potForm.name}
                        onChange={e => setPotForm(f => ({ ...f, name: e.target.value }))}
                    />

                    <div>
                        <label className="text-xs text-textMuted font-medium block mb-2">Icon</label>
                        <div className="flex gap-2 flex-wrap">
                            {POT_ICONS.map(icon => (
                                <button
                                    key={icon}
                                    onClick={() => setPotForm(f => ({ ...f, icon }))}
                                    className={`w-10 h-10 text-xl rounded-lg border transition-all ${potForm.icon === icon
                                            ? 'bg-accent/10 border-accent/50 scale-110'
                                            : 'bg-bg border-border hover:bg-cardHover opacity-70'
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-textMuted font-medium block mb-2">Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {POT_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setPotForm(f => ({ ...f, color }))}
                                    className="w-8 h-8 rounded-full border-2 transition-all"
                                    style={{
                                        backgroundColor: color,
                                        borderColor: potForm.color === color ? 'white' : 'transparent',
                                        opacity: potForm.color === color ? 1 : 0.4,
                                        transform: potForm.color === color ? 'scale(1.15)' : 'scale(1)'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <Input
                        label="Target Goal (€)"
                        type="number"
                        placeholder="10000"
                        value={potForm.target}
                        onChange={e => setPotForm(f => ({ ...f, target: e.target.value }))}
                    />
                    <Input
                        label="Monthly Commitment (€)"
                        type="number"
                        placeholder="500"
                        value={potForm.monthlyAmount}
                        onChange={e => setPotForm(f => ({ ...f, monthlyAmount: e.target.value }))}
                    />

                    <div className="flex gap-3 mt-2">
                        <Button variant="secondary" onClick={() => { setShowAddPot(false); setEditPot(null); }} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleAddPot} disabled={loading} className="flex-1">
                            {loading ? "Saving..." : editPot ? "Save Changes" : "Create Pot"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Contribution Modal */}
            <Modal open={!!showAddContrib} onClose={() => setShowAddContrib(null)} title="Add Contribution">
                <div className="flex flex-col gap-4">
                    <Input
                        label="Amount (€)"
                        type="number"
                        value={contribForm.amount}
                        onChange={e => setContribForm(f => ({ ...f, amount: e.target.value }))}
                    />
                    <Input
                        label="Date"
                        type="date"
                        value={contribForm.date}
                        onChange={e => setContribForm(f => ({ ...f, date: e.target.value }))}
                    />
                    <Input
                        label="Note (Optional)"
                        placeholder="Monthly auto-save"
                        value={contribForm.note}
                        onChange={e => setContribForm(f => ({ ...f, note: e.target.value }))}
                    />
                    <div className="flex gap-3 mt-2">
                        <Button variant="secondary" onClick={() => setShowAddContrib(null)} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleAddContrib} disabled={loading} className="flex-1">
                            {loading ? "Adding..." : "Add to Pot"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal open={!!showHistory} onClose={() => setShowHistory(null)} title="Contribution History">
                {(() => {
                    const pot = savingsPots.find(p => p.id === showHistory);
                    if (!pot) return null;

                    const sorted = [...pot.contributions].sort((a, b) => new Date(b.date) - new Date(a.date));

                    return (
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            <div className="divide-y divide-border">
                                {sorted.map(c => (
                                    <div key={c.id} className="flex items-center justify-between py-3 group">
                                        <div>
                                            <p className="font-medium text-text text-sm m-0">{c.note || "Contribution"}</p>
                                            <p className="text-xs text-textDim m-0 mt-0.5">{dateStr(c.date)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-accent text-sm">+{fmt(c.amount)}</span>
                                            <button
                                                onClick={() => handleDeleteContrib(c.id)}
                                                className="text-textDim hover:text-danger hover:bg-danger/10 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {sorted.length === 0 && (
                                <p className="text-center py-8 text-textMuted text-sm m-0">No contributions yet.</p>
                            )}
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
