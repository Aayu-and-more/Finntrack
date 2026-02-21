import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
// FINNTRACK — Complete Expense Tracker (Supabase Integrated)
// ============================================================

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, getDoc } from "firebase/firestore";

// 👇 YOUR FIREBASE PROJECT CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyB1FkQCkglPzQLjcR4lN-vB7ILkYvr5rus",
  authDomain: "finntrack-359e0.firebaseapp.com",
  projectId: "finntrack-359e0",
  storageBucket: "finntrack-359e0.firebasestorage.app",
  messagingSenderId: "817337207547",
  appId: "1:817337207547:web:7097ffe63e92113f8a3e5e"
};

const app = initializeApp(firebaseConfig);
const fbAuth = getAuth(app);
const db = getFirestore(app);

const C = {
  bg: "#0B0F1A", card: "#141925", cardHover: "#1A2030", border: "#1E2538",
  accent: "#22D3A7", accentDim: "rgba(34,211,167,0.12)",
  red: "#EF5350", redDim: "rgba(239,83,80,0.12)",
  amber: "#FFB74D", amberDim: "rgba(255,183,77,0.12)",
  blue: "#42A5F5", blueDim: "rgba(66,165,245,0.12)",
  purple: "#AB47BC", purpleDim: "rgba(171,71,188,0.12)",
  text: "#E8ECF4", textMuted: "#7A8BA8", textDim: "#4A5568", white: "#FFFFFF",
};

const CATEGORIES = [
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

const PAYMENT_APPS = ["Revolut", "AIB", "Splitwise", "Cash", "Bank Transfer", "Other"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ============================================================
// UTILITIES
// ============================================================
const fmt = (n) => (n < 0 ? "-" : "") + "€" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fmtShort = (n) => Math.abs(n) >= 1000 ? (n < 0 ? "-" : "") + "€" + (Math.abs(n) / 1000).toFixed(1) + "k" : fmt(n);
const dateStr = (d) => { const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`; };
const getMonthKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`; };
const uid = () => Math.random().toString(36).substr(2, 9);

// ============================================================
// GLOBAL CSS
// ============================================================
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 14px; height: 100%; }
    body { margin: 0; padding: 0; min-height: 100%; background: ${C.bg}; color: ${C.text}; font-family: 'DM Sans', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
    #root { min-height: 100vh; }
    button { font-family: inherit; cursor: pointer; }
    input, select, textarea { font-family: inherit; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
    select option { background: ${C.card}; color: ${C.text}; }
    input[type="checkbox"] { accent-color: ${C.accent}; }
    @media (max-width: 768px) { html { font-size: 13px; } }
  `}</style>
);

// ============================================================
// REUSABLE UI
// ============================================================
const btn = { border: "none", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", borderRadius: "8px" };

const Button = ({ children, variant = "primary", onClick, style, disabled }) => {
  const s = {
    primary: { ...btn, background: C.accent, color: C.bg, fontWeight: 600, padding: "10px 20px", fontSize: "13px" },
    secondary: { ...btn, background: C.border, color: C.text, fontWeight: 500, padding: "10px 20px", fontSize: "13px" },
    ghost: { ...btn, background: "transparent", color: C.textMuted, fontWeight: 500, padding: "8px 14px", fontSize: "13px" },
    danger: { ...btn, background: C.redDim, color: C.red, fontWeight: 500, padding: "10px 20px", fontSize: "13px" },
    small: { ...btn, background: C.border, color: C.text, fontWeight: 500, padding: "6px 12px", fontSize: "12px" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...s[variant], opacity: disabled ? 0.5 : 1, ...style }}>{children}</button>;
};

const Input = ({ label, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    {label && <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500 }}>{label}</label>}
    <input {...props} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "10px 12px", color: C.text, fontSize: "14px", fontFamily: "inherit", outline: "none", width: "100%", ...props.style }} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    {label && <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500 }}>{label}</label>}
    <select {...props} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "10px 12px", color: C.text, fontSize: "14px", fontFamily: "inherit", outline: "none", width: "100%", ...props.style }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "20px", ...style }}>{children}</div>
);

const Modal = ({ open, onClose, title, children, width = 480 }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px", width: "100%", maxWidth: width, maxHeight: "85vh", overflow: "auto", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", color: C.text, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: "20px" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Badge = ({ children, color = C.accent }) => (
  <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, color, background: color + "1A" }}>{children}</span>
);

// ============================================================
// CHARTS
// ============================================================
const SparkBar = ({ data, height = 60, color = C.accent }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = Math.min(24, (280 / data.length) - 2);
  return (
    <svg width="100%" height={height + 16} viewBox={`0 0 ${data.length * (w + 2)} ${height + 16}`} style={{ overflow: "visible" }}>
      {data.map((d, i) => (
        <g key={i}>
          <rect x={i * (w + 2)} y={height - (d.value / max) * (height - 8)} width={w} height={Math.max((d.value / max) * (height - 8), 2)} rx={3} fill={d.highlight ? color : C.border} opacity={d.highlight ? 1 : 0.5} />
          <text x={i * (w + 2) + w / 2} y={height + 12} textAnchor="middle" fill={C.textDim} fontSize="8" fontFamily="inherit">{d.label}</text>
        </g>
      ))}
    </svg>
  );
};

const DonutChart = ({ segments, size = 110 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) return null;
  const r = size / 2 - 8, cx = size / 2, cy = size / 2, ir = r * 0.6;
  let cum = 0;
  return (
    <svg width={size} height={size}>
      {segments.map((seg, i) => {
        const s = cum / total * 2 * Math.PI - Math.PI / 2; cum += seg.value;
        const e = cum / total * 2 * Math.PI - Math.PI / 2;
        const la = (e - s) > Math.PI ? 1 : 0;
        return <path key={i} d={`M ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${la} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)} L ${cx + ir * Math.cos(e)} ${cy + ir * Math.sin(e)} A ${ir} ${ir} 0 ${la} 0 ${cx + ir * Math.cos(s)} ${cy + ir * Math.sin(s)} Z`} fill={seg.color} opacity={0.85} />;
      })}
    </svg>
  );
};

const StatCard = ({ label, value, color, bg, icon }) => (
  <Card style={{ padding: "16px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
      <div>
        <p style={{ margin: 0, fontSize: "12px", color: C.textMuted, fontWeight: 500 }}>{label}</p>
        <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 700, color }}>{value}</p>
      </div>
      <div style={{ width: 32, height: 32, borderRadius: "8px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color, flexShrink: 0 }}>{icon}</div>
    </div>
  </Card>
);

// ============================================================
// DASHBOARD
// ============================================================
const Dashboard = ({ transactions, budgets, debts, savingsPots, currentMonth, setCurrentMonth, setPage }) => {
  const thisMonth = transactions.filter(t => getMonthKey(t.date) === currentMonth);
  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : "0.0";
  const byCat = {}; thisMonth.filter(t => t.type === "expense").forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const catData = Object.entries(byCat).map(([id, val]) => ({ ...CATEGORIES.find(c => c.id === id), value: val })).sort((a, b) => b.value - a.value);
  const byApp = {}; thisMonth.filter(t => t.type === "expense").forEach(t => { byApp[t.app] = (byApp[t.app] || 0) + t.amount; });
  const appData = Object.entries(byApp).sort((a, b) => b[1] - a[1]);
  const trend = []; const now = new Date(currentMonth + "-01");
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = getMonthKey(d.toISOString()); const exp = transactions.filter(t => t.type === "expense" && getMonthKey(t.date) === key).reduce((s, t) => s + t.amount, 0); trend.push({ label: MONTHS[d.getMonth()], value: exp, highlight: i === 0 }); }
  const budgetStatus = budgets.map(b => { const spent = byCat[b.category] || 0; const pct = Math.min((spent / b.limit) * 100, 100); return { ...b, spent, pct, cat: CATEGORIES.find(c => c.id === b.category) }; });
  const totalOwed = debts.filter(d => d.direction === "owed_to_me" && !d.settled).reduce((s, d) => s + d.amount, 0);
  const totalIOwe = debts.filter(d => d.direction === "i_owe" && !d.settled).reduce((s, d) => s + d.amount, 0);
  const navMonth = (dir) => { const d = new Date(currentMonth + "-01"); d.setMonth(d.getMonth() + dir); setCurrentMonth(getMonthKey(d.toISOString())); };
  const monthLabel = (() => { const d = new Date(currentMonth + "-01"); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div><h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Dashboard</h2><p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Your financial overview</p></div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navMonth(-1)} style={{ ...btn, background: C.border, color: C.textMuted, padding: "6px 10px", fontSize: "14px" }}>←</button>
          <span style={{ fontWeight: 600, fontSize: "15px", minWidth: "100px", textAlign: "center" }}>{monthLabel}</span>
          <button onClick={() => navMonth(1)} style={{ ...btn, background: C.border, color: C.textMuted, padding: "6px 10px", fontSize: "14px" }}>→</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        <StatCard label="Income" value={fmt(income)} color={C.accent} bg={C.accentDim} icon="↓" />
        <StatCard label="Expenses" value={fmt(expenses)} color={C.red} bg={C.redDim} icon="↑" />
        <StatCard label="Savings" value={fmt(savings)} color={savings >= 0 ? C.accent : C.red} bg={savings >= 0 ? C.accentDim : C.redDim} icon="◎" />
        <StatCard label="Savings Rate" value={`${savingsRate}%`} color={parseFloat(savingsRate) >= 20 ? C.accent : C.amber} bg={parseFloat(savingsRate) >= 20 ? C.accentDim : C.amberDim} icon="%" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        <Card><p style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600 }}>Monthly Spending</p><SparkBar data={trend} height={80} /></Card>
        <Card style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <DonutChart segments={catData.slice(0, 6)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 600 }}>By Category</p>
            {catData.slice(0, 4).map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}><span style={{ fontSize: "12px", color: C.textMuted }}>{c.icon} {c.name}</span><span style={{ fontSize: "12px", fontWeight: 600 }}>{fmt(c.value)}</span></div>)}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}><p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Budgets</p><button onClick={() => setPage("budgets")} style={{ ...btn, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button></div>
          {budgetStatus.length === 0 && <p style={{ color: C.textDim, fontSize: "13px" }}>No budgets set</p>}
          {budgetStatus.slice(0, 4).map(b => <div key={b.id} style={{ marginBottom: "12px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ fontSize: "12px", color: C.textMuted }}>{b.cat?.icon} {b.cat?.name}</span><span style={{ fontSize: "11px", color: b.pct > 90 ? C.red : b.pct > 70 ? C.amber : C.textMuted }}>{fmt(b.spent)} / {fmt(b.limit)}</span></div><div style={{ height: "4px", borderRadius: "2px", background: C.bg }}><div style={{ height: "100%", borderRadius: "2px", width: `${b.pct}%`, background: b.pct > 90 ? C.red : b.pct > 70 ? C.amber : C.accent }} /></div></div>)}
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}><p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Savings Pots</p><button onClick={() => setPage("savings")} style={{ ...btn, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button></div>
          {savingsPots.length === 0 && <p style={{ color: C.textDim, fontSize: "13px" }}>No savings pots set up</p>}
          {savingsPots.slice(0, 4).map(pot => { const t = pot.contributions.reduce((s, c) => s + c.amount, 0); const p = pot.target > 0 ? Math.min((t / pot.target) * 100, 100) : 0; return <div key={pot.id} style={{ marginBottom: "12px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ fontSize: "12px", color: C.textMuted }}>{pot.icon} {pot.name}</span><span style={{ fontSize: "11px", color: C.accent }}>{fmt(t)} / {fmt(pot.target)}</span></div><div style={{ height: "4px", borderRadius: "2px", background: C.bg }}><div style={{ height: "100%", borderRadius: "2px", width: `${p}%`, background: pot.color }} /></div></div>; })}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        <Card>
          <p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600 }}>By Payment App</p>
          {appData.map(([app, val]) => { const p = expenses > 0 ? (val / expenses * 100) : 0; return <div key={app} style={{ marginBottom: "10px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ fontSize: "12px", color: C.textMuted }}>{app}</span><span style={{ fontSize: "12px", fontWeight: 600 }}>{fmt(val)} <span style={{ color: C.textDim }}>({p.toFixed(0)}%)</span></span></div><div style={{ height: "4px", borderRadius: "2px", background: C.bg }}><div style={{ height: "100%", borderRadius: "2px", width: `${p}%`, background: C.blue }} /></div></div>; })}
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}><p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Debts</p><button onClick={() => setPage("debts")} style={{ ...btn, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button></div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
            <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: C.accentDim }}><p style={{ margin: 0, fontSize: "11px", color: C.accent }}>Owed to you</p><p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700, color: C.accent }}>{fmt(totalOwed)}</p></div>
            <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: C.redDim }}><p style={{ margin: 0, fontSize: "11px", color: C.red }}>You owe</p><p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700, color: C.red }}>{fmt(totalIOwe)}</p></div>
          </div>
          {debts.filter(d => !d.settled).slice(0, 3).map(d => <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}` }}><span style={{ fontSize: "12px", color: C.textMuted }}>{d.person}</span><span style={{ fontSize: "12px", fontWeight: 600, color: d.direction === "owed_to_me" ? C.accent : C.red }}>{d.direction === "owed_to_me" ? "+" : "-"}{fmt(d.amount)}</span></div>)}
        </Card>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}><p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Recent Transactions</p><button onClick={() => setPage("transactions")} style={{ ...btn, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button></div>
        {thisMonth.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6).map(t => {
          const cat = CATEGORIES.find(c => c.id === t.category); return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.border}`, gap: "12px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "8px", background: (cat?.color || "#888") + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{cat?.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat?.name}{t.note ? ` — ${t.note}` : ""}</p><p style={{ margin: "2px 0 0", fontSize: "11px", color: C.textDim }}>{dateStr(t.date)} · {t.app}</p></div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: t.type === "income" ? C.accent : C.text, flexShrink: 0 }}>{t.type === "income" ? "+" : "-"}{fmt(t.amount)}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ============================================================
// TRANSACTIONS
// ============================================================
const Transactions = ({ transactions, setTransactions, onSave, userId, supabase, loadData }) => {
  const [filter, setFilter] = useState({ type: "all", category: "all", app: "all", search: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [form, setForm] = useState({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0, 10), app: "Revolut", note: "", recurring: false });

  const filtered = useMemo(() => transactions.filter(t => (filter.type === "all" || t.type === filter.type) && (filter.category === "all" || t.category === filter.category) && (filter.app === "all" || t.app === filter.app) && (filter.search === "" || t.note?.toLowerCase().includes(filter.search.toLowerCase()) || CATEGORIES.find(c => c.id === t.category)?.name.toLowerCase().includes(filter.search.toLowerCase()))).sort((a, b) => new Date(b.date) - new Date(a.date)), [transactions, filter]);

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    const tx = { ...form, amount: parseFloat(form.amount), user_id: userId };

    let error = null;
    if (editTx) {
      const { error: err } = await supabase.from('transactions').update(tx).eq('id', editTx.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('transactions').insert([tx]);
      error = err;
    }

    if (!error) {
      await loadData();
      setShowAdd(false);
      setEditTx(null);
      setForm({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0, 10), app: "Revolut", note: "", recurring: false });
    } else {
      alert("Failed to save transaction");
    }
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) loadData();
  };

  const handleCSVImport = async (text) => {
    try {
      const lines = text.trim().split("\n"); const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 2) {
          const amount = parseFloat(cols.find(c => !isNaN(parseFloat(c))) || "0");
          const dateCol = cols.find(c => /\d{4}-\d{2}-\d{2}/.test(c)) || new Date().toISOString().slice(0, 10);
          if (amount !== 0) imported.push({ amount: Math.abs(amount), type: "expense", category: "other", date: dateCol, app: "CSV Import", note: cols[0] || "", recurring: false, user_id: userId });
        }
      }
      if (imported.length > 0) {
        const { error } = await supabase.from('transactions').insert(imported);
        if (!error) {
          await loadData();
          setShowCSV(false);
          alert(`Imported ${imported.length} transactions!`);
        }
      }
    } catch { alert("Error parsing CSV."); }
  };

  const totalFiltered = filtered.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Transactions</h2>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>{filtered.length} transactions · Net: <span style={{ color: totalFiltered >= 0 ? C.accent : C.red, fontWeight: 600 }}>{fmt(totalFiltered)}</span></p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={() => setShowCSV(true)}>Import CSV</Button>
          <Button onClick={() => { setEditTx(null); setForm({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0, 10), app: "Revolut", note: "", recurring: false }); setShowAdd(true); }}>+ Add</Button>
        </div>
      </div>

      <Card style={{ padding: "14px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "end" }}>
        <Input placeholder="Search..." value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} style={{ width: "160px" }} />
        <Select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))} options={[{ value: "all", label: "All Types" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
        <Select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))} options={[{ value: "all", label: "All Categories" }, ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))]} />
        <Select value={filter.app} onChange={e => setFilter(f => ({ ...f, app: e.target.value }))} options={[{ value: "all", label: "All Apps" }, ...PAYMENT_APPS.map(a => ({ value: a, label: a }))]} />
        {(filter.type !== "all" || filter.category !== "all" || filter.app !== "all" || filter.search) && <Button variant="ghost" onClick={() => setFilter({ type: "all", category: "all", app: "all", search: "" })}>Clear</Button>}
      </Card>

      <Card style={{ padding: 0 }}>
        {filtered.length === 0 && <p style={{ padding: "40px", textAlign: "center", color: C.textDim }}>No transactions found</p>}
        {filtered.map((t, i) => {
          const cat = CATEGORIES.find(c => c.id === t.category); return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "14px 20px", gap: "12px", borderTop: i > 0 ? `1px solid ${C.border}` : "none", cursor: "pointer" }} onClick={() => { setEditTx(t); setForm({ ...t, amount: String(t.amount) }); setShowAdd(true); }}>
              <div style={{ width: 40, height: 40, borderRadius: "10px", background: (cat?.color || "#888") + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{cat?.icon || "?"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat?.name}{t.note ? ` — ${t.note}` : ""}</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>{dateStr(t.date)} · {t.app}{t.recurring ? " · 🔄" : ""}</p>
              </div>
              <span style={{ fontSize: "15px", fontWeight: 600, color: t.type === "income" ? C.accent : C.text, flexShrink: 0 }}>{t.type === "income" ? "+" : "-"}{fmt(t.amount)}</span>
              <button onClick={e => { e.stopPropagation(); deleteTransaction(t.id); }} style={{ ...btn, background: "none", color: C.textDim, fontSize: "16px", padding: "4px 8px", border: "none" }}>×</button>
            </div>
          );
        })}
      </Card>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditTx(null); }} title={editTx ? "Edit Transaction" : "Add Transaction"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {["expense", "income"].map(type => <button key={type} onClick={() => setForm(f => ({ ...f, type }))} style={{ ...btn, flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600, background: form.type === type ? (type === "expense" ? C.redDim : C.accentDim) : C.bg, color: form.type === type ? (type === "expense" ? C.red : C.accent) : C.textMuted, border: `1px solid ${form.type === type ? (type === "expense" ? C.red : C.accent) : C.border}` }}>{type === "expense" ? "↑ Expense" : "↓ Income"}</button>)}
          </div>
          <Input label="Amount (€)" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={CATEGORIES.filter(c => form.type === "income" ? ["income", "other"].includes(c.id) : c.id !== "income").map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Select label="Payment App" value={form.app} onChange={e => setForm(f => ({ ...f, app: e.target.value }))} options={PAYMENT_APPS.map(a => ({ value: a, label: a }))} />
          <Input label="Note" placeholder="e.g., Lunch with friends" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: C.textMuted, cursor: "pointer" }}><input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} /> Recurring</label>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => { setShowAdd(false); setEditTx(null); }} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={handleSubmit} style={{ flex: 1 }}>{editTx ? "Save" : "Add"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCSV} onClose={() => setShowCSV(false)} title="Import CSV" width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: C.textMuted }}>Paste your bank CSV export. Amounts and dates will be detected automatically.</p>
          <textarea id="csv-input" rows={10} placeholder={`Date,Description,Amount\n2024-01-15,"Coffee",-4.50`} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px", color: C.text, fontSize: "13px", fontFamily: "monospace", resize: "vertical", outline: "none", width: "100%" }} />
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" onClick={() => setShowCSV(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={() => handleCSVImport(document.getElementById("csv-input").value)} style={{ flex: 1 }}>Import</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// DEBTS
// ============================================================
const Debts = ({ debts, setDebts, onSave, userId, supabase, loadData }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ person: "", amount: "", direction: "owed_to_me", note: "", date: new Date().toISOString().slice(0, 10) });

  const handleSubmit = async () => {
    if (!form.person || !form.amount) return;

    const debtData = { ...form, amount: parseFloat(form.amount), settled: false, user_id: userId };
    const { error } = await supabase.from('debts').insert([debtData]);

    if (!error) {
      await loadData();
      setShowAdd(false);
      setForm({ person: "", amount: "", direction: "owed_to_me", note: "", date: new Date().toISOString().slice(0, 10) });
    }
  };

  const handleSettle = async (id) => {
    const { error } = await supabase.from('debts').update({ settled: true }).eq('id', id);
    if (!error) loadData();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (!error) loadData();
  };

  const active = debts.filter(d => !d.settled); const settled = debts.filter(d => d.settled);
  const totalOwed = active.filter(d => d.direction === "owed_to_me").reduce((s, d) => s + d.amount, 0);
  const totalIOwe = active.filter(d => d.direction === "i_owe").reduce((s, d) => s + d.amount, 0);
  const byPerson = {}; active.forEach(d => { if (!byPerson[d.person]) byPerson[d.person] = { owed: 0, owing: 0, items: [] }; if (d.direction === "owed_to_me") byPerson[d.person].owed += d.amount; else byPerson[d.person].owing += d.amount; byPerson[d.person].items.push(d); });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div><h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Debts & Splits</h2><p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Track who owes whom</p></div>
        <Button onClick={() => setShowAdd(true)}>+ Add Debt</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        <Card style={{ padding: "16px", background: C.accentDim, border: `1px solid ${C.accent}33` }}><p style={{ margin: 0, fontSize: "12px", color: C.accent }}>Owed to you</p><p style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 700, color: C.accent }}>{fmt(totalOwed)}</p></Card>
        <Card style={{ padding: "16px", background: C.redDim, border: `1px solid ${C.red}33` }}><p style={{ margin: 0, fontSize: "12px", color: C.red }}>You owe</p><p style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 700, color: C.red }}>{fmt(totalIOwe)}</p></Card>
        <Card style={{ padding: "16px" }}><p style={{ margin: 0, fontSize: "12px", color: C.textMuted }}>Net</p><p style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 700, color: totalOwed - totalIOwe >= 0 ? C.accent : C.red }}>{fmt(totalOwed - totalIOwe)}</p></Card>
      </div>
      {Object.entries(byPerson).map(([person, data]) => (
        <Card key={person}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: C.accent }}>{person.charAt(0).toUpperCase()}</div>
              <div><p style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{person}</p><p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textMuted }}>{data.items.length} item{data.items.length > 1 ? "s" : ""}</p></div>
            </div>
            <span style={{ fontSize: "18px", fontWeight: 700, color: (data.owed - data.owing) >= 0 ? C.accent : C.red }}>{(data.owed - data.owing) >= 0 ? "+" : ""}{fmt(data.owed - data.owing)}</span>
          </div>
          {data.items.map(d => <div key={d.id} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.border}`, gap: "10px", flexWrap: "wrap" }}>
            <Badge color={d.direction === "owed_to_me" ? C.accent : C.red}>{d.direction === "owed_to_me" ? "owes you" : "you owe"}</Badge>
            <span style={{ flex: 1, fontSize: "13px", color: C.textMuted }}>{d.note || "—"}</span>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{fmt(d.amount)}</span>
            <Button variant="small" onClick={() => handleSettle(d.id)}>Settle</Button>
            <button onClick={() => handleDelete(d.id)} style={{ ...btn, background: "none", color: C.textDim, fontSize: "14px", padding: "4px", border: "none" }}>×</button>
          </div>)}
        </Card>
      ))}
      {active.length === 0 && <Card style={{ textAlign: "center", padding: "40px" }}><p style={{ color: C.textDim }}>No active debts</p></Card>}
      {settled.length > 0 && <Card style={{ opacity: 0.5 }}><p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600, color: C.textMuted }}>Settled ({settled.length})</p>{settled.slice(0, 5).map(d => <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ fontSize: "12px", color: C.textDim, textDecoration: "line-through" }}>{d.person} — {d.note || "—"}</span><span style={{ fontSize: "12px", color: C.textDim }}>{fmt(d.amount)}</span></div>)}</Card>}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Debt">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "8px" }}>{[{ v: "owed_to_me", l: "They owe me" }, { v: "i_owe", l: "I owe them" }].map(o => <button key={o.v} onClick={() => setForm(f => ({ ...f, direction: o.v }))} style={{ ...btn, flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600, background: form.direction === o.v ? (o.v === "owed_to_me" ? C.accentDim : C.redDim) : C.bg, color: form.direction === o.v ? (o.v === "owed_to_me" ? C.accent : C.red) : C.textMuted, border: `1px solid ${form.direction === o.v ? (o.v === "owed_to_me" ? C.accent : C.red) : C.border}` }}>{o.l}</button>)}</div>
          <Input label="Person" placeholder="e.g., Alex" value={form.person} onChange={e => setForm(f => ({ ...f, person: e.target.value }))} />
          <Input label="Amount (€)" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label="What for" placeholder="e.g., Dinner" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><Button variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</Button><Button onClick={handleSubmit} style={{ flex: 1 }}>Add</Button></div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// BUDGETS
// ============================================================
const Budgets = ({ budgets, setBudgets, transactions, currentMonth, onSave, userId, supabase, loadData }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: "food", limit: "" });
  const byCat = {}; transactions.filter(t => getMonthKey(t.date) === currentMonth && t.type === "expense").forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const existingCats = budgets.map(b => b.category);
  const availableCats = CATEGORIES.filter(c => !["income", "transfer"].includes(c.id) && !existingCats.includes(c.id));

  const handleSubmit = async () => {
    if (!form.limit) return;
    const budgetData = { ...form, limit: parseFloat(form.limit), period: "monthly", user_id: userId };
    const { error } = await supabase.from('budgets').insert([budgetData]);
    if (!error) {
      await loadData();
      setShowAdd(false);
      setForm({ category: availableCats[0]?.id || "food", limit: "" });
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) loadData();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div><h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Budgets</h2><p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Monthly spending limits</p></div>
        <Button onClick={() => setShowAdd(true)} disabled={availableCats.length === 0}>+ Add Budget</Button>
      </div>
      {budgets.length === 0 && <Card style={{ textAlign: "center", padding: "40px" }}><p style={{ fontSize: "32px", margin: "0 0 8px" }}>🎯</p><p style={{ color: C.textMuted }}>No budgets yet</p><Button onClick={() => setShowAdd(true)} style={{ marginTop: "12px" }}>Create one</Button></Card>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
        {budgets.map(b => {
          const cat = CATEGORIES.find(c => c.id === b.category); const spent = byCat[b.category] || 0; const pct = Math.min((spent / b.limit) * 100, 100); const remaining = b.limit - spent; const sc = pct > 90 ? C.red : pct > 70 ? C.amber : C.accent; return (
            <Card key={b.id} style={{ position: "relative" }}>
              <button onClick={() => handleDelete(b.id)} style={{ position: "absolute", top: "12px", right: "12px", ...btn, background: "none", color: C.textDim, fontSize: "14px", padding: "4px", border: "none" }}>×</button>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: (cat?.color || "#888") + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{cat?.icon}</div>
                <div><p style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{cat?.name}</p></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span style={{ fontSize: "22px", fontWeight: 700, color: sc }}>{fmt(spent)}</span><span style={{ fontSize: "14px", color: C.textMuted, alignSelf: "flex-end" }}>of {fmt(b.limit)}</span></div>
              <div style={{ height: "6px", borderRadius: "3px", background: C.bg, marginBottom: "8px" }}><div style={{ height: "100%", borderRadius: "3px", width: `${pct}%`, background: sc }} /></div>
              <p style={{ margin: 0, fontSize: "12px", color: remaining >= 0 ? C.textMuted : C.red }}>{remaining >= 0 ? `${fmt(remaining)} remaining` : `${fmt(Math.abs(remaining))} over!`}</p>
            </Card>
          );
        })}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Budget">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} options={availableCats.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
          <Input label="Monthly Limit (€)" type="number" placeholder="e.g., 200" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><Button variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</Button><Button onClick={handleSubmit} style={{ flex: 1 }}>Add</Button></div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// SAVINGS
// ============================================================
const SavingsPage = ({ savingsPots, setSavingsPots, onSave, userId, supabase, loadData }) => {
  const [showAddPot, setShowAddPot] = useState(false);
  const [showAddContrib, setShowAddContrib] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [editPot, setEditPot] = useState(null);
  const [potForm, setPotForm] = useState({ name: "", icon: "🏦", target: "", color: "#22D3A7", monthlyAmount: "" });
  const [contribForm, setContribForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
  const POT_ICONS = ["🏦", "🛡️", "📈", "✈️", "🏠", "🎓", "💍", "🚗", "👶", "💻", "🎯", "💎"];
  const POT_COLORS = ["#22D3A7", "#42A5F5", "#FFB74D", "#AB47BC", "#EC407A", "#66BB6A", "#5C6BB0", "#EF5350"];
  const totalSaved = savingsPots.reduce((s, p) => s + p.contributions.reduce((ss, c) => ss + c.amount, 0), 0);
  const totalTargets = savingsPots.reduce((s, p) => s + (p.target || 0), 0);
  const totalMonthly = savingsPots.reduce((s, p) => s + (p.monthlyAmount || 0), 0);
  const thisMonthKey = getMonthKey(new Date().toISOString());
  const thisMonthContribs = savingsPots.reduce((s, p) => s + p.contributions.filter(c => getMonthKey(c.date) === thisMonthKey).reduce((ss, c) => ss + c.amount, 0), 0);
  const now = new Date(); const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = getMonthKey(d.toISOString()); const val = savingsPots.reduce((s, p) => s + p.contributions.filter(c => getMonthKey(c.date) === key).reduce((ss, c) => ss + c.amount, 0), 0); monthlyTrend.push({ label: MONTHS[d.getMonth()], value: val, highlight: i === 0 }); }

  const handleAddPot = async () => {
    if (!potForm.name || !potForm.target) return;

    const potData = {
      name: potForm.name,
      icon: potForm.icon,
      target: parseFloat(potForm.target),
      color: potForm.color,
      monthly_amount: parseFloat(potForm.monthlyAmount) || 0,
      user_id: userId
    };

    if (editPot) {
      await supabase.from('savings_pots').update(potData).eq('id', editPot.id);
    } else {
      await supabase.from('savings_pots').insert([potData]);
    }

    await loadData();
    setShowAddPot(false); setEditPot(null);
  };

  const handleAddContrib = async () => {
    if (!contribForm.amount || !showAddContrib) return;

    const contribData = {
      pot_id: showAddContrib,
      amount: parseFloat(contribForm.amount),
      date: contribForm.date,
      note: contribForm.note,
      user_id: userId
    };

    await supabase.from('savings_contributions').insert([contribData]);
    await loadData();
    setShowAddContrib(null);
  };

  const handleDeletePot = async (id) => {
    await supabase.from('savings_pots').delete().eq('id', id);
    loadData();
  };

  const handleDeleteContrib = async (id) => {
    await supabase.from('savings_contributions').delete().eq('id', id);
    loadData();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div><h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Savings & Investments</h2><p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Pay yourself first</p></div>
        <Button onClick={() => { setEditPot(null); setPotForm({ name: "", icon: "🏦", target: "", color: "#22D3A7", monthlyAmount: "" }); setShowAddPot(true); }}>+ New Pot</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        <StatCard label="Total Saved" value={fmt(totalSaved)} color={C.accent} bg={C.accentDim} icon="🏦" />
        <StatCard label="This Month" value={fmt(thisMonthContribs)} color={C.blue} bg={C.blueDim} icon="📅" />
        <StatCard label="Monthly Commitment" value={fmt(totalMonthly)} color={C.purple} bg={C.purpleDim} icon="🔄" />
        <StatCard label="Progress" value={totalTargets > 0 ? `${((totalSaved / totalTargets) * 100).toFixed(1)}%` : "—"} color={C.amber} bg={C.amberDim} icon="🎯" />
      </div>

      <Card><p style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600 }}>Monthly Contributions</p><SparkBar data={monthlyTrend} height={70} color={C.blue} /></Card>

      {savingsPots.length === 0 && <Card style={{ textAlign: "center", padding: "50px 20px" }}><p style={{ fontSize: "40px", margin: "0 0 12px" }}>🏦</p><p style={{ color: C.text, fontSize: "16px", fontWeight: 600 }}>No savings pots yet</p><Button onClick={() => setShowAddPot(true)} style={{ marginTop: "12px" }}>Create one</Button></Card>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        {savingsPots.map(pot => {
          const potTotal = pot.contributions.reduce((s, c) => s + c.amount, 0); const pct = pot.target > 0 ? Math.min((potTotal / pot.target) * 100, 100) : 0; const remaining = pot.target - potTotal; const monthsToGoal = pot.monthlyAmount > 0 && remaining > 0 ? Math.ceil(remaining / pot.monthlyAmount) : null; const thisMonthPot = pot.contributions.filter(c => getMonthKey(c.date) === thisMonthKey).reduce((s, c) => s + c.amount, 0); const monthlyHit = pot.monthlyAmount > 0 && thisMonthPot >= pot.monthlyAmount; return (
            <Card key={pot.id} style={{ borderTop: `3px solid ${pot.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "12px", background: pot.color + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{pot.icon}</div>
                  <div><p style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{pot.name}</p>{pot.monthlyAmount > 0 && <p style={{ margin: "2px 0 0", fontSize: "12px", color: monthlyHit ? C.accent : C.amber }}>{monthlyHit ? "✓ done" : `${fmt(pot.monthlyAmount - thisMonthPot)} left`} this month</p>}</div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => { setEditPot(pot); setPotForm({ name: pot.name, icon: pot.icon, target: String(pot.target), color: pot.color, monthlyAmount: String(pot.monthlyAmount || "") }); setShowAddPot(true); }} style={{ ...btn, background: "none", color: C.textDim, fontSize: "13px", padding: "4px", border: "none" }}>✎</button>
                  <button onClick={() => handleDeletePot(pot.id)} style={{ ...btn, background: "none", color: C.textDim, fontSize: "14px", padding: "4px", border: "none" }}>×</button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}><span style={{ fontSize: "24px", fontWeight: 700, color: pot.color }}>{fmt(potTotal)}</span><span style={{ fontSize: "13px", color: C.textMuted }}>of {fmt(pot.target)}</span></div>
              <div style={{ height: "8px", borderRadius: "4px", background: C.bg, overflow: "hidden", marginBottom: "6px" }}><div style={{ height: "100%", borderRadius: "4px", width: `${pct}%`, background: `linear-gradient(90deg, ${pot.color}88, ${pot.color})` }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><span style={{ fontSize: "11px", color: C.textDim }}>{pct.toFixed(1)}%</span>{monthsToGoal && <span style={{ fontSize: "11px", color: C.textDim }}>~{monthsToGoal}mo to goal</span>}</div>
              {pot.contributions.slice(-2).reverse().map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ fontSize: "11px", color: C.textDim }}>{dateStr(c.date)}</span><span style={{ fontSize: "11px", fontWeight: 600, color: C.accent }}>+{fmt(c.amount)}</span></div>)}
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <Button onClick={() => { setShowAddContrib(pot.id); setContribForm({ amount: String(pot.monthlyAmount || ""), date: new Date().toISOString().slice(0, 10), note: "" }); }} style={{ flex: 1, fontSize: "12px" }}>+ Add</Button>
                <Button variant="secondary" onClick={() => setShowHistory(pot.id)} style={{ flex: 1, fontSize: "12px" }}>History</Button>
              </div>
            </Card>
          );
        })}
      </div>

      {savingsPots.length > 0 && totalMonthly > 0 && <Card><p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600 }}>Projected Growth</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>{[3, 6, 12, 24].map(m => <div key={m} style={{ padding: "14px", background: C.bg, borderRadius: "8px", textAlign: "center" }}><p style={{ margin: 0, fontSize: "11px", color: C.textDim }}>{m} months</p><p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 700, color: C.accent }}>{fmtShort(totalSaved + totalMonthly * m)}</p></div>)}</div></Card>}

      <Modal open={showAddPot} onClose={() => { setShowAddPot(false); setEditPot(null); }} title={editPot ? "Edit Pot" : "New Savings Pot"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Input label="Name" placeholder="e.g., Emergency Fund" value={potForm.name} onChange={e => setPotForm(f => ({ ...f, name: e.target.value }))} />
          <div><label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500, display: "block", marginBottom: "6px" }}>Icon</label><div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{POT_ICONS.map(icon => <button key={icon} onClick={() => setPotForm(f => ({ ...f, icon }))} style={{ ...btn, width: 38, height: 38, fontSize: "18px", borderRadius: "8px", background: potForm.icon === icon ? C.accentDim : C.bg, border: `1px solid ${potForm.icon === icon ? C.accent : C.border}` }}>{icon}</button>)}</div></div>
          <div><label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500, display: "block", marginBottom: "6px" }}>Color</label><div style={{ display: "flex", gap: "6px" }}>{POT_COLORS.map(color => <button key={color} onClick={() => setPotForm(f => ({ ...f, color }))} style={{ ...btn, width: 30, height: 30, borderRadius: "50%", background: color, border: potForm.color === color ? `2px solid ${C.white}` : "2px solid transparent", opacity: potForm.color === color ? 1 : 0.5 }} />)}</div></div>
          <Input label="Target (€)" type="number" placeholder="10000" value={potForm.target} onChange={e => setPotForm(f => ({ ...f, target: e.target.value }))} />
          <Input label="Monthly Commitment (€)" type="number" placeholder="500" value={potForm.monthlyAmount} onChange={e => setPotForm(f => ({ ...f, monthlyAmount: e.target.value }))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><Button variant="secondary" onClick={() => { setShowAddPot(false); setEditPot(null); }} style={{ flex: 1 }}>Cancel</Button><Button onClick={handleAddPot} style={{ flex: 1 }}>{editPot ? "Save" : "Create"}</Button></div>
        </div>
      </Modal>
      <Modal open={!!showAddContrib} onClose={() => setShowAddContrib(null)} title="Add Contribution">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Input label="Amount (€)" type="number" value={contribForm.amount} onChange={e => setContribForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label="Date" type="date" value={contribForm.date} onChange={e => setContribForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Note" placeholder="Monthly auto-save" value={contribForm.note} onChange={e => setContribForm(f => ({ ...f, note: e.target.value }))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><Button variant="secondary" onClick={() => setShowAddContrib(null)} style={{ flex: 1 }}>Cancel</Button><Button onClick={handleAddContrib} style={{ flex: 1 }}>Add</Button></div>
        </div>
      </Modal>
      <Modal open={!!showHistory} onClose={() => setShowHistory(null)} title="History" width={520}>
        {(() => { const pot = savingsPots.find(p => p.id === showHistory); if (!pot) return null; const sorted = [...pot.contributions].sort((a, b) => new Date(b.date) - new Date(a.date)); return <div>{sorted.map(c => <div key={c.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}`, gap: "10px" }}><div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: "13px" }}>{c.note || "Contribution"}</p><p style={{ margin: "2px 0 0", fontSize: "11px", color: C.textDim }}>{dateStr(c.date)}</p></div><span style={{ fontSize: "14px", fontWeight: 600, color: C.accent }}>+{fmt(c.amount)}</span><button onClick={() => handleDeleteContrib(c.id)} style={{ ...btn, background: C.redDim, color: C.red, fontSize: "11px", padding: "4px 8px", border: "none" }}>Remove</button></div>)}{sorted.length === 0 && <p style={{ textAlign: "center", padding: "20px", color: C.textDim }}>No contributions</p>}</div>; })()}
      </Modal>
    </div>
  );
};

// ============================================================
// SETTINGS
// ============================================================
const Settings = ({ transactions, debts, budgets, savingsPots, setTransactions, setDebts, setBudgets, setSavingsPots, onSave }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const handleExport = () => { const d = JSON.stringify({ transactions, debts, budgets, savingsPots, exportedAt: new Date().toISOString() }, null, 2); const b = new Blob([d], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `finntrack-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(u); };
  const handleImport = () => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json"; inp.onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (d.transactions) setTransactions(d.transactions); if (d.debts) setDebts(d.debts); if (d.budgets) setBudgets(d.budgets); if (d.savingsPots) setSavingsPots(d.savingsPots); onSave(); alert("Imported!"); } catch { alert("Invalid file."); } }; inp.click(); };
  const handleReset = () => { setTransactions([]); setDebts([]); setBudgets([]); setSavingsPots([]); onSave(); setShowConfirm(false); };
  const stats = { tx: transactions.length, inc: transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0), exp: transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0), saved: savingsPots.reduce((s, p) => s + p.contributions.reduce((ss, c) => ss + c.amount, 0), 0) };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Settings</h2>
      <Card><p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600 }}>Overview</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>{[{ l: "Transactions", v: stats.tx }, { l: "Total Income", v: fmtShort(stats.inc) }, { l: "Total Expenses", v: fmtShort(stats.exp) }, { l: "Total Saved", v: fmtShort(stats.saved) }].map((s, i) => <div key={i} style={{ padding: "12px", background: C.bg, borderRadius: "8px" }}><p style={{ margin: 0, fontSize: "11px", color: C.textDim }}>{s.l}</p><p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 700 }}>{s.v}</p></div>)}</div></Card>
      <Card><p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600 }}>Data</p><div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: C.bg, borderRadius: "8px" }}><div><p style={{ margin: 0, fontSize: "14px" }}>Export</p><p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>Download JSON backup</p></div><Button variant="secondary" onClick={handleExport}>Export</Button></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: C.bg, borderRadius: "8px" }}><div><p style={{ margin: 0, fontSize: "14px" }}>Import</p><p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>Restore from backup</p></div><Button variant="secondary" onClick={handleImport}>Import</Button></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: C.redDim, borderRadius: "8px" }}><div><p style={{ margin: 0, fontSize: "14px", color: C.red }}>Reset All</p><p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>Delete everything</p></div><Button variant="danger" onClick={() => setShowConfirm(true)}>Reset</Button></div>
      </div></Card>
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Reset?" width={380}><p style={{ color: C.textMuted, fontSize: "14px", margin: "0 0 20px" }}>This permanently deletes all data.</p><div style={{ display: "flex", gap: "8px" }}><Button variant="secondary" onClick={() => setShowConfirm(false)} style={{ flex: 1 }}>Cancel</Button><Button variant="danger" onClick={handleReset} style={{ flex: 1 }}>Delete</Button></div></Modal>
    </div>
  );
};

// ============================================================
// AUTH SCREEN (mobile-friendly)
// ============================================================
const AuthScreen = ({ onAuth, supabase }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setError(""); setMessage(""); setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user && !data.session) setMessage("Check your email for a confirmation link!");
        else if (data.session) onAuth(data.session);
      } else if (mode === "login") {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onAuth(data.session);
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email);
        if (err) throw err;
        setMessage("Reset email sent!");
      }
    } catch (e) { setError(e.message || e.msg || "Something went wrong"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <GlobalCSS />
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: 48, height: 48, borderRadius: "12px", background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 700, color: C.bg, marginBottom: "12px" }}>F</div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: C.text }}>FinnTrack</h1>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "14px" }}>Track expenses across all your apps</p>
        </div>
        <Card style={{ padding: "28px" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 600, textAlign: "center" }}>{mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            {mode !== "forgot" && <Input label="Password" type="password" placeholder={mode === "signup" ? "Min 6 characters" : "Your password"} value={password} onChange={e => setPassword(e.target.value)} />}
            {error && <p style={{ margin: 0, fontSize: "13px", color: C.red, background: C.redDim, padding: "8px 12px", borderRadius: "6px" }}>{error}</p>}
            {message && <p style={{ margin: 0, fontSize: "13px", color: C.accent, background: C.accentDim, padding: "8px 12px", borderRadius: "6px" }}>{message}</p>}
            <Button onClick={handleSubmit} disabled={loading} style={{ width: "100%", marginTop: "4px" }}>{loading ? "..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Link"}</Button>
          </div>
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            {mode === "login" && <><button onClick={() => setMode("signup")} style={{ ...btn, background: "none", color: C.accent, fontSize: "13px", border: "none" }}>Sign up</button><br /><button onClick={() => setMode("forgot")} style={{ ...btn, background: "none", color: C.textDim, fontSize: "12px", marginTop: "6px", border: "none" }}>Forgot password?</button></>}
            {mode === "signup" && <button onClick={() => setMode("login")} style={{ ...btn, background: "none", color: C.accent, fontSize: "13px", border: "none" }}>Already have an account? Log in</button>}
            {mode === "forgot" && <button onClick={() => setMode("login")} style={{ ...btn, background: "none", color: C.accent, fontSize: "13px", border: "none" }}>Back to login</button>}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================================
// FIREBASE WRAPPER (Mimicking Supabase API for seamless transition)
// ============================================================
const createFirebaseWrapper = () => {
  const mapUser = (u) => u ? { ...u, id: u.uid } : null;

  const auth = {
    async signUp({ email, password }) {
      try {
        const uc = await createUserWithEmailAndPassword(fbAuth, email, password);
        const mappedUser = mapUser(uc.user);
        return { data: { user: mappedUser, session: { user: mappedUser } }, error: null };
      } catch (e) { return { data: {}, error: { message: e.message } }; }
    },
    async signInWithPassword({ email, password }) {
      try {
        const uc = await signInWithEmailAndPassword(fbAuth, email, password);
        const mappedUser = mapUser(uc.user);
        return { data: { session: { user: mappedUser }, user: mappedUser }, error: null };
      } catch (e) { return { data: {}, error: { message: e.message } }; }
    },
    async signOut() {
      try { await signOut(fbAuth); return { error: null }; }
      catch (e) { return { error: { message: e.message } }; }
    },
    async resetPasswordForEmail(email) {
      try { await sendPasswordResetEmail(fbAuth, email); return { error: null }; }
      catch (e) { return { error: { message: e.message } }; }
    },
    async getSession() {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(fbAuth, (user) => {
          unsubscribe();
          const mappedUser = mapUser(user);
          resolve({ data: { session: mappedUser ? { user: mappedUser } : null }, error: null });
        });
      });
    },
    getUser() { return mapUser(fbAuth.currentUser); }
  };

  const from = (table) => {
    let bd = null, mt = "GET", mf = [], oc = null, oa = true, eqId = null;
    const b = {
      select() { mt = "GET"; return b; },
      insert(d) { bd = Array.isArray(d) ? d : [d]; mt = "POST"; return b; },
      update(d) { bd = d; mt = "PATCH"; return b; },
      delete() { mt = "DELETE"; return b; },
      eq(c, v) {
        if (c === 'id') eqId = v;
        else mf.push({ c, v });
        return b;
      },
      order(c, { ascending: a = true } = {}) { oc = c; oa = a; return b; },
      async then(resolve) {
        try {
          const colRef = collection(db, table);
          if (mt === "GET") {
            let qConstraints = [];
            mf.forEach(f => qConstraints.push(where(f.c, "==", f.v)));
            if (oc) qConstraints.push(orderBy(oc, oa ? "asc" : "desc"));

            const q = query(colRef, ...qConstraints);
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return resolve({ data, error: null });
          }
          else if (mt === "POST") {
            console.log("🔥 FIRESTORE POST INITIATED:", { table, bd });
            const results = [];
            for (const item of bd) {
              // Ensure we don't save undefined values to firestore
              const cleanItem = Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined));
              console.log("🔥 FIRESTORE ATTEMPTING addDoc:", cleanItem);
              try {
                const docRef = await addDoc(colRef, cleanItem);
                console.log("✅ FIRESTORE addDoc SUCCESS:", docRef.id);
                results.push({ id: docRef.id, ...cleanItem });
              } catch (addErr) {
                console.error("❌ FIRESTORE addDoc FAILED:", addErr);
                throw addErr;
              }
            }
            return resolve({ data: results, error: null });
          }
          else if (mt === "PATCH") {
            if (!eqId) throw new Error("Update requires an ID");
            const dRef = doc(db, table, eqId);
            const cleanItem = Object.fromEntries(Object.entries(bd).filter(([_, v]) => v !== undefined));
            await updateDoc(dRef, cleanItem);
            return resolve({ data: [{ id: eqId, ...cleanItem }], error: null });
          }
          else if (mt === "DELETE") {
            if (!eqId) throw new Error("Delete requires an ID");
            const dRef = doc(db, table, eqId);
            await deleteDoc(dRef);
            return resolve({ data: [], error: null });
          }
        } catch (e) {
          console.error("Firebase Error:", e);
          resolve({ data: null, error: e });
        }
      }
    };
    return b;
  };
  return { auth, from };
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [supabase] = useState(() => createFirebaseWrapper());
  const isDemo = false; // DISABLED DEMO MODE
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsPots, setSavingsPots] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(getMonthKey(new Date().toISOString()));
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setSession(data.session);
      setAuthChecked(true);
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!userId) return;

    setSyncing(true);
    try {
      const [txR, bR, dR, pR] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase.from("budgets").select("*").eq("user_id", userId),
        supabase.from("debts").select("*").eq("user_id", userId),
        supabase.from("savings_pots").select("*").eq("user_id", userId)
      ]);

      setTransactions((txR.data || []).map(t => ({ ...t, amount: parseFloat(t.amount) })));
      setBudgets((bR.data || []).map(b => ({ ...b, limit: parseFloat(b.limit) })));
      setDebts((dR.data || []).map(d => ({ ...d, amount: parseFloat(d.amount) })));

      const pots = pR.data || [];
      if (pots.length > 0) {
        const cR = await supabase.from("savings_contributions").select("*").eq("user_id", userId);
        const contribs = (cR.data || []).map(c => ({ ...c, amount: parseFloat(c.amount) }));
        setSavingsPots(pots.map(p => ({ ...p, target: parseFloat(p.target), monthlyAmount: parseFloat(p.monthly_amount || 0), contributions: contribs.filter(c => c.pot_id === p.id) })));
      } else {
        setSavingsPots([]);
      }
    } catch (e) { console.error(e); }
    setSyncing(false); setLoaded(true);
  }, [userId, supabase]);

  useEffect(() => { if (userId) loadData(); }, [userId, loadData]);

  const save = useCallback(() => { /* No-op: handled by individual components */ }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); setTransactions([]); setDebts([]); setBudgets([]); setSavingsPots([]); setLoaded(false); };

  if (authChecked && !session) return <AuthScreen onAuth={s => setSession(s)} supabase={supabase} />;
  if (!authChecked || (!loaded && userId)) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><GlobalCSS /><p style={{ color: C.textMuted }}>Loading...</p></div>;

  const NAV = [{ id: "dashboard", icon: "◎", label: "Dashboard" }, { id: "transactions", icon: "↕", label: "Transactions" }, { id: "savings", icon: "🏦", label: "Savings" }, { id: "debts", icon: "⇄", label: "Debts" }, { id: "budgets", icon: "🎯", label: "Budgets" }, { id: "settings", icon: "⚙", label: "Settings" }];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>
      <GlobalCSS />

      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998 }} />}

      {/* Sidebar */}
      <aside id="ft-sidebar" style={{
        width: 220,
        height: "100vh",
        background: C.card,
        borderRight: `1px solid ${C.border}`,
        padding: "20px 0",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 999,
        transition: "left 0.2s ease",
        position: "fixed",
        top: 0,
        left: sidebarOpen ? "0" : "-220px"
      }}>
        <style>{`
        @media (min-width: 769px) { #ft-sidebar { left: 0 !important; } }
      `}</style>
        <div style={{ padding: "0 16px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "8px", background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: C.bg, flexShrink: 0 }}>F</div>
          <span style={{ fontSize: "17px", fontWeight: 700, whiteSpace: "nowrap" }}>FinnTrack</span>
        </div>
        <div style={{ padding: "0 16px", marginBottom: "16px" }}>
          <div style={{ padding: "6px 10px", borderRadius: "6px", background: C.accentDim, fontSize: "11px", fontWeight: 500, color: C.accent }}>{syncing ? "Syncing..." : "✓ Connected"}</div>
          {session?.user?.email && <p style={{ margin: "6px 0 0", fontSize: "11px", color: C.textDim, overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.email}</p>}
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", padding: "0 8px" }}>
          {NAV.map(n => <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false); }} style={{ ...btn, display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", fontSize: "14px", fontWeight: 500, background: page === n.id ? C.accentDim : "transparent", color: page === n.id ? C.accent : C.textMuted, borderRadius: "8px", whiteSpace: "nowrap", border: "none", width: "100%", textAlign: "left" }}><span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>{n.icon}</span>{n.label}</button>)}
        </nav>
        <button onClick={handleSignOut} style={{ ...btn, display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", margin: "0 8px", fontSize: "13px", fontWeight: 500, background: "transparent", color: C.red, borderRadius: "8px", border: "none", width: "calc(100% - 16px)", textAlign: "left" }}><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>↪</span>Sign Out</button>
      </aside>

      {/* Main Content Area */}
      <div id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0, transition: "padding-left 0.2s ease" }}>
        <style>{`
          #main-content { padding-left: 220px; }
          @media (max-width: 768px) { #main-content { padding-left: 0 !important; } }
        `}</style>

        {/* Mobile header (hidden on desktop) */}
        <div className="mob-header" style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "none", alignItems: "center", gap: "12px", background: C.card, position: "sticky", top: 0, zIndex: 100 }}>
          <style>{`@media (max-width: 768px) { .mob-header { display: flex !important; } }`}</style>
          <button onClick={() => setSidebarOpen(true)} style={{ ...btn, background: C.border, color: C.text, padding: "8px 10px", fontSize: "16px", border: "none" }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: "15px" }}>{NAV.find(n => n.id === page)?.label || "FinnTrack"}</span>
        </div>

        {/* This container centers your pages and prevents the left-skewed look */}
        <main style={{ flex: 1, padding: "24px 24px 40px", overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", maxWidth: "1100px" }}>
            {page === "dashboard" && <Dashboard transactions={transactions} budgets={budgets} debts={debts} savingsPots={savingsPots} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} setPage={setPage} />}
            {page === "transactions" && <Transactions transactions={transactions} setTransactions={setTransactions} onSave={save} userId={userId} supabase={supabase} loadData={loadData} />}
            {page === "savings" && <SavingsPage savingsPots={savingsPots} setSavingsPots={setSavingsPots} onSave={save} userId={userId} supabase={supabase} loadData={loadData} />}
            {page === "debts" && <Debts debts={debts} setDebts={setDebts} onSave={save} userId={userId} supabase={supabase} loadData={loadData} />}
            {page === "budgets" && <Budgets budgets={budgets} setBudgets={setBudgets} transactions={transactions} currentMonth={currentMonth} onSave={save} userId={userId} supabase={supabase} loadData={loadData} />}
            {page === "settings" && <Settings transactions={transactions} debts={debts} budgets={budgets} savingsPots={savingsPots} setTransactions={setTransactions} setDebts={setDebts} setBudgets={setBudgets} setSavingsPots={setSavingsPots} onSave={save} />}
          </div>
        </main>
      </div>
    </div>
  );
}