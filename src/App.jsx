import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
// FINNTRACK — Complete Expense Tracker
// ============================================================

const SUPABASE_URL = "https://jepzcqsigscbbtnaisrj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplcHpjcXNpZ3NjYmJ0bmFpc3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzEzODQsImV4cCI6MjA4NjYwNzM4NH0.3tGl-OlSlD-2npDwKHKyGmZAFfaFZRMf7Dp-fsb1oik";

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
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ============================================================
// UTILITIES
// ============================================================
const fmt = (n) => (n < 0 ? "-" : "") + "€" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const fmtShort = (n) => Math.abs(n) >= 1000 ? (n < 0 ? "-" : "") + "€" + (Math.abs(n)/1000).toFixed(1) + "k" : fmt(n);
const dateStr = (d) => { const x = new Date(d); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`; };
const getMonthKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`; };
const uid = () => Math.random().toString(36).substr(2, 9);

// ============================================================
// PERSISTENT STORAGE (demo mode only)
// ============================================================
const DB = {
  async load(key, fb) { try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : fb; } catch { return fb; } },
  async save(key, data) { try { await window.storage.set(key, JSON.stringify(data)); } catch {} }
};

// ============================================================
// SAMPLE DATA
// ============================================================
const generateSampleData = () => {
  const now = new Date();
  const transactions = [];
  const apps = PAYMENT_APPS.slice(0, 3);
  const expCats = CATEGORIES.filter(c => !["income","transfer"].includes(c.id));
  for (let m = 0; m < 3; m++) {
    const month = new Date(now.getFullYear(), now.getMonth() - m, 1);
    transactions.push({ id: uid(), amount: 2800, type: "income", category: "income", date: new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0,10), app: "AIB", note: "Salary", recurring: true });
    const count = 15 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const cat = expCats[Math.floor(Math.random() * expCats.length)];
      const day = 1 + Math.floor(Math.random() * 28);
      const ranges = { food:[8,45], transport:[3,30], shopping:[15,120], bills:[30,150], entertainment:[10,50], health:[20,80], groceries:[15,90], rent:[800,1200], education:[10,50], subscriptions:[5,20], travel:[30,200], other:[5,60] };
      const [mn, mx] = ranges[cat.id] || [5, 50];
      transactions.push({ id: uid(), amount: +(mn + Math.random() * (mx - mn)).toFixed(2), type: "expense", category: cat.id, date: new Date(month.getFullYear(), month.getMonth(), day).toISOString().slice(0,10), app: apps[Math.floor(Math.random() * apps.length)], note: "", recurring: cat.id === "subscriptions" || cat.id === "rent" });
    }
  }
  const debts = [
    { id: uid(), person: "Alex", amount: 45.50, direction: "owed_to_me", note: "Dinner split", date: now.toISOString().slice(0,10), settled: false },
    { id: uid(), person: "Sarah", amount: 22.00, direction: "i_owe", note: "Cinema tickets", date: now.toISOString().slice(0,10), settled: false },
    { id: uid(), person: "Mike", amount: 180.00, direction: "owed_to_me", note: "Weekend trip", date: now.toISOString().slice(0,10), settled: false },
  ];
  const budgets = [
    { id: uid(), category: "food", limit: 400, period: "monthly" },
    { id: uid(), category: "entertainment", limit: 100, period: "monthly" },
    { id: uid(), category: "shopping", limit: 200, period: "monthly" },
    { id: uid(), category: "transport", limit: 120, period: "monthly" },
  ];
  const savingsPots = [
    { id: uid(), name: "Emergency Fund", icon: "🛡️", target: 10000, color: "#22D3A7", monthlyAmount: 500, contributions: [
      { id: uid(), amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0,10), note: "Monthly" },
      { id: uid(), amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0,10), note: "Monthly" },
      { id: uid(), amount: 500, date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), note: "Monthly" },
    ]},
    { id: uid(), name: "Investments (ETFs)", icon: "📈", target: 25000, color: "#42A5F5", monthlyAmount: 200, contributions: [
      { id: uid(), amount: 200, date: new Date(now.getFullYear(), now.getMonth() - 2, 5).toISOString().slice(0,10), note: "S&P 500" },
      { id: uid(), amount: 200, date: new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString().slice(0,10), note: "S&P 500" },
      { id: uid(), amount: 200, date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().slice(0,10), note: "S&P 500" },
    ]},
    { id: uid(), name: "Holiday Fund", icon: "✈️", target: 3000, color: "#FFB74D", monthlyAmount: 150, contributions: [
      { id: uid(), amount: 150, date: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0,10), note: "Monthly" },
      { id: uid(), amount: 150, date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0,10), note: "Monthly" },
      { id: uid(), amount: 150, date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), note: "Monthly" },
    ]},
  ];
  return { transactions, debts, budgets, savingsPots };
};

// ============================================================
// GLOBAL CSS — Injected once, overrides everything
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
    @media (max-width: 768px) {
      html { font-size: 13px; }
    }
  `}</style>
);

// ============================================================
// MINI CHARTS
// ============================================================
const SparkBar = ({ data, height = 60, color = C.accent }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = Math.min(24, (280 / data.length) - 2);
  return (
    <svg width="100%" height={height + 16} viewBox={`0 0 ${data.length * (w + 2)} ${height + 16}`} style={{ overflow: "visible" }}>
      {data.map((d, i) => (
        <g key={i}>
          <rect x={i*(w+2)} y={height - (d.value/max)*(height-8)} width={w} height={Math.max((d.value/max)*(height-8), 2)} rx={3} fill={d.highlight ? color : C.border} opacity={d.highlight ? 1 : 0.5} />
          <text x={i*(w+2)+w/2} y={height+12} textAnchor="middle" fill={C.textDim} fontSize="8" fontFamily="inherit">{d.label}</text>
        </g>
      ))}
    </svg>
  );
};

const DonutChart = ({ segments, size = 110 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) return null;
  const r = size/2 - 8, cx = size/2, cy = size/2, ir = r*0.6;
  let cum = 0;
  return (
    <svg width={size} height={size}>
      {segments.map((seg, i) => {
        const s = cum/total*2*Math.PI - Math.PI/2; cum += seg.value;
        const e = cum/total*2*Math.PI - Math.PI/2;
        const la = (e-s) > Math.PI ? 1 : 0;
        return <path key={i} d={`M ${cx+r*Math.cos(s)} ${cy+r*Math.sin(s)} A ${r} ${r} 0 ${la} 1 ${cx+r*Math.cos(e)} ${cy+r*Math.sin(e)} L ${cx+ir*Math.cos(e)} ${cy+ir*Math.sin(e)} A ${ir} ${ir} 0 ${la} 0 ${cx+ir*Math.cos(s)} ${cy+ir*Math.sin(s)} Z`} fill={seg.color} opacity={0.85} />;
      })}
    </svg>
  );
};

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
// STAT CARD (used on dashboard + savings)
// ============================================================
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
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Dashboard</h2>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Your financial overview</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navMonth(-1)} style={{ ...btn, background: C.border, color: C.textMuted, padding: "6px 10px", fontSize: "14px" }}>←</button>
          <span style={{ fontWeight: 600, fontSize: "15px", minWidth: "100px", textAlign: "center" }}>{monthLabel}</span>
          <button onClick={() => navMonth(1)} style={{ ...btn, background: C.border, color: C.textMuted, padding: "6px 10px", fontSize: "14px" }}>→</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
        <StatCard label="Income" value={fmt(income)} color={C.accent} bg={C.accentDim} icon="↓" />
        <StatCard label="Expenses" value={fmt(expenses)} color={C.red} bg={C.redDim} icon="↑" />
        <StatCard label="Savings" value={fmt(savings)} color={savings >= 0 ? C.accent : C.red} bg={savings >= 0 ? C.accentDim : C.redDim} icon="◎" />
        <StatCard label="Savings Rate" value={`${savingsRate}%`} color={parseFloat(savingsRate) >= 20 ? C.accent : C.amber} bg={parseFloat(savingsRate) >= 20 ? C.accentDim : C.amberDim} icon="%" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
        <Card><p style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600 }}>Monthly Spending</p><SparkBar data={trend} height={80} /></Card>
        <Card style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <DonutChart segments={catData.slice(0, 6)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 600 }}>By Category</p>
            {catData.slice(0, 4).map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}><span style={{ fontSize: "12px", color: C.textMuted }}>{c.icon} {c.name}</span><span style={{ fontSize: "12px", fontWeight: 600 }}>{fmt(c.value)}</span></div>)}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}><p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Budgets</p><button onClick={() => setPage("budgets")} style={{ ...btn, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button></div>
          {budgetStatus.length === 0 && <p style={{ color: C.textDim, fontSize: "13px" }}>No budgets set</p>}
          {budgetStatus.slice(0, 4).map(b => <div key={b.id} style={{ marginBottom: "12px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ fontSize: "12px", color: C.textMuted }}>{b.cat?.icon} {b.cat?.name}</span><span style={{ fontSize: "11px", color: b.pct > 90 ? C.red : b.pct > 70 ? C.amber : C.textMuted }}>{fmt(b.spent)} / {fmt(b.limit)}</span></div><div style={{ height: "4px", borderRadius: "2px", background: C.bg }}><div style={{ height: "100%", borderRadius: "2px", width: `${b.pct}%`, background: b.pct > 90 ? C.red : b.pct > 70 ? C.amber : C.accent }} /></div></div>)}
        </Card>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}><p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Savings Pots</p><button onClick={() => setPage("savings")} style={{ ...btn, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button></div>
          {savingsPots.length === 0 && <p style={{ color: C.textDim, fontSize: "13px" }}>No savings pots set up</p>}
          {savingsPots.slice(0, 4).map(pot => { const t = pot.contributions.reduce((s, c) => s + c.amount, 0); const p = pot.target > 0 ? Math.min((t/pot.target)*100, 100) : 0; return <div key={pot.id} style={{ marginBottom: "12px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ fontSize: "12px", color: C.textMuted }}>{pot.icon} {pot.name}</span><span style={{ fontSize: "11px", color: C.accent }}>{fmt(t)} / {fmt(pot.target)}</span></div><div style={{ height: "4px", borderRadius: "2px", background: C.bg }}><div style={{ height: "100%", borderRadius: "2px", width: `${p}%`, background: pot.color }} /></div></div>; })}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
        <Card>
          <p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600 }}>By Payment App</p>
          {appData.map(([app, val]) => { const p = expenses > 0 ? (val/expenses*100) : 0; return <div key={app} style={{ marginBottom: "10px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span style={{ fontSize: "12px", color: C.textMuted }}>{app}</span><span style={{ fontSize: "12px", fontWeight: 600 }}>{fmt(val)} <span style={{color: C.textDim}}>({p.toFixed(0)}%)</span></span></div><div style={{ height: "4px", borderRadius: "2px", background: C.bg }}><div style={{ height: "100%", borderRadius: "2px", width: `${p}%`, background: C.blue }} /></div></div>; })}
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
        {thisMonth.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6).map(t => { const cat = CATEGORIES.find(c => c.id === t.category); return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.border}`, gap: "12px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "8px", background: (cat?.color||"#888") + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{cat?.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat?.name}{t.note ? ` — ${t.note}` : ""}</p><p style={{ margin: "2px 0 0", fontSize: "11px", color: C.textDim }}>{dateStr(t.date)} · {t.app}</p></div>
            <span style={{ fontSize: "14px", fontWeight: 600, color: t.type === "income" ? C.accent : C.text, flexShrink: 0 }}>{t.type === "income" ? "+" : "-"}{fmt(t.amount)}</span>
          </div>
        ); })}
      </Card>
    </div>
  );
};

// ============================================================
// TRANSACTIONS
// ============================================================
const Transactions = ({ transactions, setTransactions, onSave }) => {
  const [filter, setFilter] = useState({ type: "all", category: "all", app: "all", search: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [form, setForm] = useState({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0,10), app: "Revolut", note: "", recurring: false });

  const filtered = useMemo(() => transactions.filter(t => (filter.type === "all" || t.type === filter.type) && (filter.category === "all" || t.category === filter.category) && (filter.app === "all" || t.app === filter.app) && (filter.search === "" || t.note?.toLowerCase().includes(filter.search.toLowerCase()) || CATEGORIES.find(c=>c.id===t.category)?.name.toLowerCase().includes(filter.search.toLowerCase()))).sort((a, b) => new Date(b.date) - new Date(a.date)), [transactions, filter]);

  const handleSubmit = () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    const tx = { ...form, amount: parseFloat(form.amount), id: editTx ? editTx.id : uid() };
    if (editTx) setTransactions(prev => prev.map(t => t.id === editTx.id ? tx : t));
    else setTransactions(prev => [...prev, tx]);
    onSave(); setShowAdd(false); setEditTx(null);
    setForm({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0,10), app: "Revolut", note: "", recurring: false });
  };

  const handleCSVImport = (text) => {
    try {
      const lines = text.trim().split("\n"); const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 2) {
          const amount = parseFloat(cols.find(c => !isNaN(parseFloat(c))) || "0");
          const dateCol = cols.find(c => /\d{4}-\d{2}-\d{2}/.test(c)) || new Date().toISOString().slice(0,10);
          if (amount !== 0) imported.push({ id: uid(), amount: Math.abs(amount), type: "expense", category: "other", date: dateCol, app: "CSV Import", note: cols[0] || "", recurring: false });
        }
      }
      if (imported.length > 0) { setTransactions(prev => [...prev, ...imported]); onSave(); }
      setShowCSV(false); alert(`Imported ${imported.length} transactions!`);
    } catch { alert("Error parsing CSV."); }
  };

  const totalFiltered = filtered.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Transactions</h2>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>{filtered.length} transactions · Net: <span style={{color: totalFiltered >= 0 ? C.accent : C.red, fontWeight: 600}}>{fmt(totalFiltered)}</span></p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={() => setShowCSV(true)}>Import CSV</Button>
          <Button onClick={() => { setEditTx(null); setForm({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0,10), app: "Revolut", note: "", recurring: false }); setShowAdd(true); }}>+ Add</Button>
        </div>
      </div>

      <Card style={{ padding: "14px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "end" }}>
        <Input placeholder="Search..." value={filter.search} onChange={e => setFilter(f => ({...f, search: e.target.value}))} style={{ width: "160px" }} />
        <Select value={filter.type} onChange={e => setFilter(f => ({...f, type: e.target.value}))} options={[{value:"all",label:"All Types"},{value:"income",label:"Income"},{value:"expense",label:"Expense"}]} />
        <Select value={filter.category} onChange={e => setFilter(f => ({...f, category: e.target.value}))} options={[{value:"all",label:"All Categories"}, ...CATEGORIES.map(c=>({value:c.id,label:`${c.icon} ${c.name}`}))]} />
        <Select value={filter.app} onChange={e => setFilter(f => ({...f, app: e.target.value}))} options={[{value:"all",label:"All Apps"}, ...PAYMENT_APPS.map(a=>({value:a,label:a}))]} />
        {(filter.type !== "all" || filter.category !== "all" || filter.app !== "all" || filter.search) && <Button variant="ghost" onClick={() => setFilter({type:"all",category:"all",app:"all",search:""})}>Clear</Button>}
      </Card>

      <Card style={{ padding: 0 }}>
        {filtered.length === 0 && <p style={{ padding: "40px", textAlign: "center", color: C.textDim }}>No transactions found</p>}
        {filtered.map((t, i) => { const cat = CATEGORIES.find(c => c.id === t.category); return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "14px 20px", gap: "12px", borderTop: i > 0 ? `1px solid ${C.border}` : "none", cursor: "pointer" }} onClick={() => { setEditTx(t); setForm({ ...t, amount: String(t.amount) }); setShowAdd(true); }}>
            <div style={{ width: 40, height: 40, borderRadius: "10px", background: (cat?.color||"#888")+"1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{cat?.icon || "?"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat?.name}{t.note ? ` — ${t.note}` : ""}</p>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>{dateStr(t.date)} · {t.app}{t.recurring ? " · 🔄" : ""}</p>
            </div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: t.type === "income" ? C.accent : C.text, flexShrink: 0 }}>{t.type === "income" ? "+" : "-"}{fmt(t.amount)}</span>
            <button onClick={e => { e.stopPropagation(); setTransactions(prev => prev.filter(x => x.id !== t.id)); onSave(); }} style={{ ...btn, background: "none", color: C.textDim, fontSize: "16px", padding: "4px 8px", border: "none" }}>×</button>
          </div>
        ); })}
      </Card>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditTx(null); }} title={editTx ? "Edit Transaction" : "Add Transaction"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {["expense", "income"].map(type => <button key={type} onClick={() => setForm(f => ({...f, type}))} style={{ ...btn, flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600, background: form.type === type ? (type === "expense" ? C.redDim : C.accentDim) : C.bg, color: form.type === type ? (type === "expense" ? C.red : C.accent) : C.textMuted, border: `1px solid ${form.type === type ? (type === "expense" ? C.red : C.accent) : C.border}` }}>{type === "expense" ? "↑ Expense" : "↓ Income"}</button>)}
          </div>
          <Input label="Amount (€)" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} options={CATEGORIES.filter(c => form.type === "income" ? ["income","other"].includes(c.id) : c.id !== "income").map(c => ({value: c.id, label: `${c.icon} ${c.name}`}))} />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
          <Select label="Payment App" value={form.app} onChange={e => setForm(f => ({...f, app: e.target.value}))} options={PAYMENT_APPS.map(a => ({value: a, label: a}))} />
          <Input label="Note" placeholder="e.g., Lunch with friends" value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} />
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: C.textMuted, cursor: "pointer" }}><input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({...f, recurring: e.target.checked}))} /> Recurring</label>
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
const Debts = ({ debts, setDebts, onSave }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ person: "", amount: "", direction: "owed_to_me", note: "", date: new Date().toISOString().slice(0,10) });
  const handleSubmit = () => { if (!form.person || !form.amount) return; setDebts(prev => [...prev, { ...form, amount: parseFloat(form.amount), id: uid(), settled: false }]); onSave(); setShowAdd(false); setForm({ person: "", amount: "", direction: "owed_to_me", note: "", date: new Date().toISOString().slice(0,10) }); };
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
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
            <Button variant="small" onClick={() => { setDebts(prev => prev.map(x => x.id === d.id ? { ...x, settled: true } : x)); onSave(); }}>Settle</Button>
            <button onClick={() => { setDebts(prev => prev.filter(x => x.id !== d.id)); onSave(); }} style={{ ...btn, background: "none", color: C.textDim, fontSize: "14px", padding: "4px", border: "none" }}>×</button>
          </div>)}
        </Card>
      ))}
      {active.length === 0 && <Card style={{ textAlign: "center", padding: "40px" }}><p style={{ color: C.textDim }}>No active debts</p></Card>}
      {settled.length > 0 && <Card style={{ opacity: 0.5 }}><p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600, color: C.textMuted }}>Settled ({settled.length})</p>{settled.slice(0,5).map(d => <div key={d.id} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0" }}><span style={{ fontSize:"12px",color:C.textDim,textDecoration:"line-through" }}>{d.person} — {d.note||"—"}</span><span style={{fontSize:"12px",color:C.textDim}}>{fmt(d.amount)}</span></div>)}</Card>}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Debt">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "8px" }}>{[{v:"owed_to_me",l:"They owe me"},{v:"i_owe",l:"I owe them"}].map(o => <button key={o.v} onClick={() => setForm(f => ({...f, direction: o.v}))} style={{ ...btn, flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600, background: form.direction === o.v ? (o.v === "owed_to_me" ? C.accentDim : C.redDim) : C.bg, color: form.direction === o.v ? (o.v === "owed_to_me" ? C.accent : C.red) : C.textMuted, border: `1px solid ${form.direction === o.v ? (o.v === "owed_to_me" ? C.accent : C.red) : C.border}` }}>{o.l}</button>)}</div>
          <Input label="Person" placeholder="e.g., Alex" value={form.person} onChange={e => setForm(f => ({...f, person: e.target.value}))} />
          <Input label="Amount (€)" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} />
          <Input label="What for" placeholder="e.g., Dinner" value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><Button variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</Button><Button onClick={handleSubmit} style={{ flex: 1 }}>Add</Button></div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// BUDGETS
// ============================================================
const Budgets = ({ budgets, setBudgets, transactions, currentMonth, onSave }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: "food", limit: "" });
  const byCat = {}; transactions.filter(t => getMonthKey(t.date) === currentMonth && t.type === "expense").forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const existingCats = budgets.map(b => b.category);
  const availableCats = CATEGORIES.filter(c => !["income","transfer"].includes(c.id) && !existingCats.includes(c.id));
  const handleSubmit = () => { if (!form.limit) return; setBudgets(prev => [...prev, { ...form, limit: parseFloat(form.limit), id: uid(), period: "monthly" }]); onSave(); setShowAdd(false); setForm({ category: availableCats[0]?.id || "food", limit: "" }); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div><h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Budgets</h2><p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Monthly spending limits</p></div>
        <Button onClick={() => setShowAdd(true)} disabled={availableCats.length === 0}>+ Add Budget</Button>
      </div>
      {budgets.length === 0 && <Card style={{ textAlign: "center", padding: "40px" }}><p style={{ fontSize: "32px", margin: "0 0 8px" }}>🎯</p><p style={{ color: C.textMuted }}>No budgets yet</p><Button onClick={() => setShowAdd(true)} style={{ marginTop: "12px" }}>Create one</Button></Card>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
        {budgets.map(b => { const cat = CATEGORIES.find(c => c.id === b.category); const spent = byCat[b.category] || 0; const pct = Math.min((spent/b.limit)*100, 100); const remaining = b.limit - spent; const sc = pct > 90 ? C.red : pct > 70 ? C.amber : C.accent; return (
          <Card key={b.id} style={{ position: "relative" }}>
            <button onClick={() => { setBudgets(prev => prev.filter(x => x.id !== b.id)); onSave(); }} style={{ position: "absolute", top: "12px", right: "12px", ...btn, background: "none", color: C.textDim, fontSize: "14px", padding: "4px", border: "none" }}>×</button>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "10px", background: (cat?.color||"#888")+"1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{cat?.icon}</div>
              <div><p style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{cat?.name}</p></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><span style={{ fontSize: "22px", fontWeight: 700, color: sc }}>{fmt(spent)}</span><span style={{ fontSize: "14px", color: C.textMuted, alignSelf: "flex-end" }}>of {fmt(b.limit)}</span></div>
            <div style={{ height: "6px", borderRadius: "3px", background: C.bg, marginBottom: "8px" }}><div style={{ height: "100%", borderRadius: "3px", width: `${pct}%`, background: sc }} /></div>
            <p style={{ margin: 0, fontSize: "12px", color: remaining >= 0 ? C.textMuted : C.red }}>{remaining >= 0 ? `${fmt(remaining)} remaining` : `${fmt(Math.abs(remaining))} over!`}</p>
          </Card>
        ); })}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Budget">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} options={availableCats.map(c => ({value: c.id, label: `${c.icon} ${c.name}`}))} />
          <Input label="Monthly Limit (€)" type="number" placeholder="e.g., 200" value={form.limit} onChange={e => setForm(f => ({...f, limit: e.target.value}))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><Button variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</Button><Button onClick={handleSubmit} style={{ flex: 1 }}>Add</Button></div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// SAVINGS
// ============================================================
const SavingsPage = ({ savingsPots, setSavingsPots, onSave }) => {
  const [showAddPot, setShowAddPot] = useState(false);
  const [showAddContrib, setShowAddContrib] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [editPot, setEditPot] = useState(null);
  const [potForm, setPotForm] = useState({ name: "", icon: "🏦", target: "", color: "#22D3A7", monthlyAmount: "" });
  const [contribForm, setContribForm] = useState({ amount: "", date: new Date().toISOString().slice(0,10), note: "" });
  const POT_ICONS = ["🏦","🛡️","📈","✈️","🏠","🎓","💍","🚗","👶","💻","🎯","💎"];
  const POT_COLORS = ["#22D3A7","#42A5F5","#FFB74D","#AB47BC","#EC407A","#66BB6A","#5C6BC0","#EF5350"];
  const totalSaved = savingsPots.reduce((s, p) => s + p.contributions.reduce((ss, c) => ss + c.amount, 0), 0);
  const totalTargets = savingsPots.reduce((s, p) => s + (p.target || 0), 0);
  const totalMonthly = savingsPots.reduce((s, p) => s + (p.monthlyAmount || 0), 0);
  const thisMonthKey = getMonthKey(new Date().toISOString());
  const thisMonthContribs = savingsPots.reduce((s, p) => s + p.contributions.filter(c => getMonthKey(c.date) === thisMonthKey).reduce((ss, c) => ss + c.amount, 0), 0);
  const now = new Date(); const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = getMonthKey(d.toISOString()); const val = savingsPots.reduce((s, p) => s + p.contributions.filter(c => getMonthKey(c.date) === key).reduce((ss, c) => ss + c.amount, 0), 0); monthlyTrend.push({ label: MONTHS[d.getMonth()], value: val, highlight: i === 0 }); }

  const handleAddPot = () => { if (!potForm.name || !potForm.target) return; if (editPot) setSavingsPots(prev => prev.map(p => p.id === editPot.id ? { ...p, name: potForm.name, icon: potForm.icon, target: parseFloat(potForm.target), color: potForm.color, monthlyAmount: parseFloat(potForm.monthlyAmount) || 0 } : p)); else setSavingsPots(prev => [...prev, { id: uid(), name: potForm.name, icon: potForm.icon, target: parseFloat(potForm.target), color: potForm.color, monthlyAmount: parseFloat(potForm.monthlyAmount) || 0, contributions: [] }]); onSave(); setShowAddPot(false); setEditPot(null); };
  const handleAddContrib = () => { if (!contribForm.amount || !showAddContrib) return; setSavingsPots(prev => prev.map(p => p.id === showAddContrib ? { ...p, contributions: [...p.contributions, { id: uid(), amount: parseFloat(contribForm.amount), date: contribForm.date, note: contribForm.note }] } : p)); onSave(); setShowAddContrib(null); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div><h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Savings & Investments</h2><p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Pay yourself first</p></div>
        <Button onClick={() => { setEditPot(null); setPotForm({ name: "", icon: "🏦", target: "", color: "#22D3A7", monthlyAmount: "" }); setShowAddPot(true); }}>+ New Pot</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
        <StatCard label="Total Saved" value={fmt(totalSaved)} color={C.accent} bg={C.accentDim} icon="🏦" />
        <StatCard label="This Month" value={fmt(thisMonthContribs)} color={C.blue} bg={C.blueDim} icon="📅" />
        <StatCard label="Monthly Commitment" value={fmt(totalMonthly)} color={C.purple} bg={C.purpleDim} icon="🔄" />
        <StatCard label="Progress" value={totalTargets > 0 ? `${((totalSaved/totalTargets)*100).toFixed(1)}%` : "—"} color={C.amber} bg={C.amberDim} icon="🎯" />
      </div>

      <Card><p style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600 }}>Monthly Contributions</p><SparkBar data={monthlyTrend} height={70} color={C.blue} /></Card>

      {savingsPots.length === 0 && <Card style={{ textAlign: "center", padding: "50px 20px" }}><p style={{ fontSize: "40px", margin: "0 0 12px" }}>🏦</p><p style={{ color: C.text, fontSize: "16px", fontWeight: 600 }}>No savings pots yet</p><Button onClick={() => setShowAddPot(true)} style={{ marginTop: "12px" }}>Create one</Button></Card>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
        {savingsPots.map(pot => { const potTotal = pot.contributions.reduce((s, c) => s + c.amount, 0); const pct = pot.target > 0 ? Math.min((potTotal/pot.target)*100, 100) : 0; const remaining = pot.target - potTotal; const monthsToGoal = pot.monthlyAmount > 0 && remaining > 0 ? Math.ceil(remaining / pot.monthlyAmount) : null; const thisMonthPot = pot.contributions.filter(c => getMonthKey(c.date) === thisMonthKey).reduce((s, c) => s + c.amount, 0); const monthlyHit = pot.monthlyAmount > 0 && thisMonthPot >= pot.monthlyAmount; return (
          <Card key={pot.id} style={{ borderTop: `3px solid ${pot.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 42, height: 42, borderRadius: "12px", background: pot.color + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{pot.icon}</div>
                <div><p style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{pot.name}</p>{pot.monthlyAmount > 0 && <p style={{ margin: "2px 0 0", fontSize: "12px", color: monthlyHit ? C.accent : C.amber }}>{monthlyHit ? "✓ done" : `${fmt(pot.monthlyAmount - thisMonthPot)} left`} this month</p>}</div>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={() => { setEditPot(pot); setPotForm({ name: pot.name, icon: pot.icon, target: String(pot.target), color: pot.color, monthlyAmount: String(pot.monthlyAmount||"") }); setShowAddPot(true); }} style={{ ...btn, background: "none", color: C.textDim, fontSize: "13px", padding: "4px", border: "none" }}>✎</button>
                <button onClick={() => { setSavingsPots(prev => prev.filter(p => p.id !== pot.id)); onSave(); }} style={{ ...btn, background: "none", color: C.textDim, fontSize: "14px", padding: "4px", border: "none" }}>×</button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}><span style={{ fontSize: "24px", fontWeight: 700, color: pot.color }}>{fmt(potTotal)}</span><span style={{ fontSize: "13px", color: C.textMuted }}>of {fmt(pot.target)}</span></div>
            <div style={{ height: "8px", borderRadius: "4px", background: C.bg, overflow: "hidden", marginBottom: "6px" }}><div style={{ height: "100%", borderRadius: "4px", width: `${pct}%`, background: `linear-gradient(90deg, ${pot.color}88, ${pot.color})` }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><span style={{ fontSize: "11px", color: C.textDim }}>{pct.toFixed(1)}%</span>{monthsToGoal && <span style={{ fontSize: "11px", color: C.textDim }}>~{monthsToGoal}mo to goal</span>}</div>
            {pot.contributions.slice(-2).reverse().map(c => <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span style={{ fontSize: "11px", color: C.textDim }}>{dateStr(c.date)}</span><span style={{ fontSize: "11px", fontWeight: 600, color: C.accent }}>+{fmt(c.amount)}</span></div>)}
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <Button onClick={() => { setShowAddContrib(pot.id); setContribForm({ amount: String(pot.monthlyAmount||""), date: new Date().toISOString().slice(0,10), note: "" }); }} style={{ flex: 1, fontSize: "12px" }}>+ Add</Button>
              <Button variant="secondary" onClick={() => setShowHistory(pot.id)} style={{ flex: 1, fontSize: "12px" }}>History</Button>
            </div>
          </Card>
        ); })}
      </div>

      {savingsPots.length > 0 && totalMonthly > 0 && <Card><p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600 }}>Projected Growth</p><div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>{[3,6,12,24].map(m => <div key={m} style={{ padding: "14px", background: C.bg, borderRadius: "8px", textAlign: "center" }}><p style={{ margin: 0, fontSize: "11px", color: C.textDim }}>{m} months</p><p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 700, color: C.accent }}>{fmtShort(totalSaved + totalMonthly * m)}</p></div>)}</div></Card>}

      <Modal open={showAddPot} onClose={() => { setShowAddPot(false); setEditPot(null); }} title={editPot ? "Edit Pot" : "New Savings Pot"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Input label="Name" placeholder="e.g., Emergency Fund" value={potForm.name} onChange={e => setPotForm(f => ({...f, name: e.target.value}))} />
          <div><label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500, display: "block", marginBottom: "6px" }}>Icon</label><div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{POT_ICONS.map(icon => <button key={icon} onClick={() => setPotForm(f => ({...f, icon}))} style={{ ...btn, width: 38, height: 38, fontSize: "18px", borderRadius: "8px", background: potForm.icon === icon ? C.accentDim : C.bg, border: `1px solid ${potForm.icon === icon ? C.accent : C.border}` }}>{icon}</button>)}</div></div>
          <div><label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500, display: "block", marginBottom: "6px" }}>Color</label><div style={{ display: "flex", gap: "6px" }}>{POT_COLORS.map(color => <button key={color} onClick={() => setPotForm(f => ({...f, color}))} style={{ ...btn, width: 30, height: 30, borderRadius: "50%", background: color, border: potForm.color === color ? `2px solid ${C.white}` : "2px solid transparent", opacity: potForm.color === color ? 1 : 0.5 }} />)}</div></div>
          <Input label="Target (€)" type="number" placeholder="10000" value={potForm.target} onChange={e => setPotForm(f => ({...f, target: e.target.value}))} />
          <Input label="Monthly Commitment (€)" type="number" placeholder="500" value={potForm.monthlyAmount} onChange={e => setPotForm(f => ({...f, monthlyAmount: e.target.value}))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><Button variant="secondary" onClick={() => { setShowAddPot(false); setEditPot(null); }} style={{ flex: 1 }}>Cancel</Button><Button onClick={handleAddPot} style={{ flex: 1 }}>{editPot ? "Save" : "Create"}</Button></div>
        </div>
      </Modal>
      <Modal open={!!showAddContrib} onClose={() => setShowAddContrib(null)} title="Add Contribution">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Input label="Amount (€)" type="number" value={contribForm.amount} onChange={e => setContribForm(f => ({...f, amount: e.target.value}))} />
          <Input label="Date" type="date" value={contribForm.date} onChange={e => setContribForm(f => ({...f, date: e.target.value}))} />
          <Input label="Note" placeholder="Monthly auto-save" value={contribForm.note} onChange={e => setContribForm(f => ({...f, note: e.target.value}))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}><Button variant="secondary" onClick={() => setShowAddContrib(null)} style={{ flex: 1 }}>Cancel</Button><Button onClick={handleAddContrib} style={{ flex: 1 }}>Add</Button></div>
        </div>
      </Modal>
      <Modal open={!!showHistory} onClose={() => setShowHistory(null)} title="History" width={520}>
        {(() => { const pot = savingsPots.find(p => p.id === showHistory); if (!pot) return null; const sorted = [...pot.contributions].sort((a,b) => new Date(b.date)-new Date(a.date)); return <div>{sorted.map(c => <div key={c.id} style={{ display:"flex",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`,gap:"10px" }}><div style={{flex:1}}><p style={{margin:0,fontSize:"13px"}}>{c.note||"Contribution"}</p><p style={{margin:"2px 0 0",fontSize:"11px",color:C.textDim}}>{dateStr(c.date)}</p></div><span style={{fontSize:"14px",fontWeight:600,color:C.accent}}>+{fmt(c.amount)}</span><button onClick={() => { setSavingsPots(prev => prev.map(p => p.id === pot.id ? {...p,contributions:p.contributions.filter(x=>x.id!==c.id)} : p)); onSave(); }} style={{...btn,background:C.redDim,color:C.red,fontSize:"11px",padding:"4px 8px",border:"none"}}>Remove</button></div>)}{sorted.length === 0 && <p style={{textAlign:"center",padding:"20px",color:C.textDim}}>No contributions</p>}</div>; })()}
      </Modal>
    </div>
  );
};

// ============================================================
// SETTINGS
// ============================================================
const Settings = ({ transactions, debts, budgets, savingsPots, setTransactions, setDebts, setBudgets, setSavingsPots, onSave }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const handleExport = () => { const d = JSON.stringify({ transactions, debts, budgets, savingsPots, exportedAt: new Date().toISOString() }, null, 2); const b = new Blob([d], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `finntrack-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(u); };
  const handleImport = () => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json"; inp.onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (d.transactions) setTransactions(d.transactions); if (d.debts) setDebts(d.debts); if (d.budgets) setBudgets(d.budgets); if (d.savingsPots) setSavingsPots(d.savingsPots); onSave(); alert("Imported!"); } catch { alert("Invalid file."); } }; inp.click(); };
  const handleReset = () => { setTransactions([]); setDebts([]); setBudgets([]); setSavingsPots([]); onSave(); setShowConfirm(false); };
  const stats = { tx: transactions.length, inc: transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0), exp: transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0), saved: savingsPots.reduce((s,p)=>s+p.contributions.reduce((ss,c)=>ss+c.amount,0),0) };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Settings</h2>
      <Card><p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600 }}>Overview</p><div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>{[{l:"Transactions",v:stats.tx},{l:"Total Income",v:fmtShort(stats.inc)},{l:"Total Expenses",v:fmtShort(stats.exp)},{l:"Total Saved",v:fmtShort(stats.saved)}].map((s,i) => <div key={i} style={{ padding: "12px", background: C.bg, borderRadius: "8px" }}><p style={{ margin: 0, fontSize: "11px", color: C.textDim }}>{s.l}</p><p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 700 }}>{s.v}</p></div>)}</div></Card>
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
            {mode === "login" && <><button onClick={() => setMode("signup")} style={{ ...btn, background: "none", color: C.accent, fontSize: "13px", border: "none" }}>Sign up</button><br/><button onClick={() => setMode("forgot")} style={{ ...btn, background: "none", color: C.textDim, fontSize: "12px", marginTop: "6px", border: "none" }}>Forgot password?</button></>}
            {mode === "signup" && <button onClick={() => setMode("login")} style={{ ...btn, background: "none", color: C.accent, fontSize: "13px", border: "none" }}>Already have an account? Log in</button>}
            {mode === "forgot" && <button onClick={() => setMode("login")} style={{ ...btn, background: "none", color: C.accent, fontSize: "13px", border: "none" }}>Back to login</button>}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================================
// SUPABASE CLIENT (with session persistence)
// ============================================================
const createSupabaseClient = (url, key) => {
  const listeners = new Set();
  const SK = "finntrack-auth";
  let accessToken = null, refreshToken = null, currentUser = null;
  try { const s = JSON.parse(sessionStorage.getItem(SK)); if (s) { accessToken = s.a; refreshToken = s.r; currentUser = s.u; } } catch {}
  const persist = () => { try { if (accessToken) sessionStorage.setItem(SK, JSON.stringify({a:accessToken,r:refreshToken,u:currentUser})); else sessionStorage.removeItem(SK); } catch {} };
  const h = () => ({ "Content-Type": "application/json", "apikey": key, ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}) });
  const rUrl = `${url}/rest/v1`, aUrl = `${url}/auth/v1`;

  const auth = {
    async signUp({ email, password }) {
      const r = await fetch(`${aUrl}/signup`, { method: "POST", headers: {"Content-Type":"application/json","apikey":key}, body: JSON.stringify({email,password}) });
      const d = await r.json(); if (!r.ok) return {data:{},error:d};
      if (d.access_token) { accessToken=d.access_token; refreshToken=d.refresh_token; currentUser=d.user; persist(); }
      return { data: { user: d.user, session: d.access_token ? { access_token: d.access_token, user: d.user } : null }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const r = await fetch(`${aUrl}/token?grant_type=password`, { method: "POST", headers: {"Content-Type":"application/json","apikey":key}, body: JSON.stringify({email,password}) });
      const d = await r.json(); if (!r.ok) return {data:{},error:d};
      accessToken=d.access_token; refreshToken=d.refresh_token; currentUser=d.user; persist();
      return { data: { session: { access_token: d.access_token, user: d.user }, user: d.user }, error: null };
    },
    async signOut() { try { await fetch(`${aUrl}/logout`, { method:"POST", headers:h() }); } catch {} accessToken=null; refreshToken=null; currentUser=null; persist(); return {error:null}; },
    async resetPasswordForEmail(email) { const r = await fetch(`${aUrl}/recover`, { method:"POST", headers:{"Content-Type":"application/json","apikey":key}, body:JSON.stringify({email}) }); if (!r.ok) return {error:await r.json()}; return {error:null}; },
    async getSession() {
      if (accessToken && refreshToken) {
        try { const r = await fetch(`${aUrl}/token?grant_type=refresh_token`, { method:"POST", headers:{"Content-Type":"application/json","apikey":key}, body:JSON.stringify({refresh_token:refreshToken}) }); if (r.ok) { const d = await r.json(); accessToken=d.access_token; refreshToken=d.refresh_token; currentUser=d.user; persist(); return {data:{session:{access_token:accessToken,user:currentUser}},error:null}; } } catch {}
        accessToken=null; refreshToken=null; currentUser=null; persist();
      }
      return {data:{session:null},error:null};
    },
    getUser() { return currentUser; },
    onAuthStateChange(fn) { listeners.add(fn); return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}}; },
  };

  const from = (table) => {
    let bd=null, mt="GET", mf=[], sc="*", oc=null, oa=true, si=false;
    const b = {
      select(c="*") { sc=c; mt="GET"; return b; }, insert(d) { bd=Array.isArray(d)?d:[d]; mt="POST"; return b; },
      update(d) { bd=d; mt="PATCH"; return b; }, delete() { mt="DELETE"; return b; },
      eq(c,v) { mf.push(`${c}=eq.${v}`); return b; }, order(c,{ascending:a=true}={}) { oc=c; oa=a; return b; }, single() { si=true; return b; },
      async then(resolve) {
        try {
          let q = `select=${sc}`; mf.forEach(f => q += `&${f}`); if (oc) q += `&order=${oc}.${oa?"asc":"desc"}`;
          const hd = {...h()}; if (mt==="POST") hd["Prefer"]="return=representation"; if (mt==="PATCH"||mt==="DELETE") hd["Prefer"]="return=representation"; if (si) hd["Accept"]="application/vnd.pgrst.object+json";
          const r = await fetch(`${rUrl}/${table}?${q}`, { method:mt, headers:hd, ...(bd?{body:JSON.stringify(bd)}:{}) });
          const d = await r.json(); resolve(r.ok ? {data:d,error:null} : {data:null,error:d});
        } catch (e) { resolve({data:null,error:e}); }
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
  const [supabase] = useState(() => createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  const isDemo = !SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL";
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

  useEffect(() => { if (isDemo) { setAuthChecked(true); return; } supabase.auth.getSession().then(({ data }) => { if (data?.session) setSession(data.session); setAuthChecked(true); }); }, []);

  const loadData = useCallback(async () => {
    if (isDemo || !userId) {
      const data = await DB.load("finntrack-data", null);
      if (data) { setTransactions(data.transactions||[]); setDebts(data.debts||[]); setBudgets(data.budgets||[]); setSavingsPots(data.savingsPots||[]); }
      else { const s = generateSampleData(); setTransactions(s.transactions); setDebts(s.debts); setBudgets(s.budgets); setSavingsPots(s.savingsPots); }
      setLoaded(true); return;
    }
    setSyncing(true);
    try {
      const [txR, bR, dR, pR] = await Promise.all([supabase.from("transactions").select("*").eq("user_id",userId).order("date",{ascending:false}), supabase.from("budgets").select("*").eq("user_id",userId), supabase.from("debts").select("*").eq("user_id",userId), supabase.from("savings_pots").select("*").eq("user_id",userId)]);
      setTransactions((txR.data||[]).map(t=>({...t,amount:parseFloat(t.amount)}))); setBudgets((bR.data||[]).map(b=>({...b,limit:parseFloat(b.limit)}))); setDebts((dR.data||[]).map(d=>({...d,amount:parseFloat(d.amount)})));
      const pots = pR.data || [];
      if (pots.length > 0) { const cR = await supabase.from("savings_contributions").select("*").eq("user_id",userId); const contribs = (cR.data||[]).map(c=>({...c,amount:parseFloat(c.amount)})); setSavingsPots(pots.map(p=>({...p,target:parseFloat(p.target),monthlyAmount:parseFloat(p.monthly_amount||0),contributions:contribs.filter(c=>c.pot_id===p.id)}))); }
      else setSavingsPots([]);
    } catch (e) { console.error(e); }
    setSyncing(false); setLoaded(true);
  }, [userId, isDemo]);

  useEffect(() => { if (isDemo || userId) loadData(); }, [userId, isDemo, loadData]);

  const save = useCallback(() => { if (isDemo) setTimeout(() => DB.save("finntrack-data", { transactions, debts, budgets, savingsPots }), 100); }, [transactions, debts, budgets, savingsPots, isDemo]);
  useEffect(() => { if (loaded && isDemo) save(); }, [transactions, debts, budgets, savingsPots, loaded, save, isDemo]);

  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); setTransactions([]); setDebts([]); setBudgets([]); setSavingsPots([]); setLoaded(false); };

  if (!isDemo && authChecked && !session) return <AuthScreen onAuth={s => setSession(s)} supabase={supabase} />;
  if (!authChecked || !loaded) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><GlobalCSS /><p style={{ color: C.textMuted }}>Loading...</p></div>;

  const NAV = [{id:"dashboard",icon:"◎",label:"Dashboard"},{id:"transactions",icon:"↕",label:"Transactions"},{id:"savings",icon:"🏦",label:"Savings"},{id:"debts",icon:"⇄",label:"Debts"},{id:"budgets",icon:"🎯",label:"Budgets"},{id:"settings",icon:"⚙",label:"Settings"}];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>
      <GlobalCSS />

      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998, display: "none" }} className="mob-overlay" />}

      {/* Sidebar */}
      <aside id="ft-sidebar" style={{ width: 220, minHeight: "100vh", background: C.card, borderRight: `1px solid ${C.border}`, padding: "20px 0", display: "flex", flexDirection: "column", flexShrink: 0, zIndex: 999, transition: "left 0.2s ease" }}>
      <style>{`
  #ft-sidebar { position: fixed; left: ${sidebarOpen ? "0" : "-220"}px; top: 0; bottom: 0; }
  @media (min-width: 769px) { #ft-sidebar { position: relative !important; left: 0 !important; } }
  @media (max-width: 768px) { .mob-overlay { display: block !important; } }
`}</style>
        <div style={{ padding: "0 16px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 32, height: 32, borderRadius: "8px", background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: C.bg, flexShrink: 0 }}>F</div>
          <span style={{ fontSize: "17px", fontWeight: 700, whiteSpace: "nowrap" }}>FinnTrack</span>
        </div>
        <div style={{ padding: "0 16px", marginBottom: "16px" }}>
          <div style={{ padding: "6px 10px", borderRadius: "6px", background: isDemo ? C.amberDim : C.accentDim, fontSize: "11px", fontWeight: 500, color: isDemo ? C.amber : C.accent }}>{isDemo ? "⚠ Demo mode" : `✓ Connected${syncing ? "..." : ""}`}</div>
          {!isDemo && session?.user?.email && <p style={{ margin: "6px 0 0", fontSize: "11px", color: C.textDim, overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.email}</p>}
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", padding: "0 8px" }}>
          {NAV.map(n => <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false); }} style={{ ...btn, display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", fontSize: "14px", fontWeight: 500, background: page === n.id ? C.accentDim : "transparent", color: page === n.id ? C.accent : C.textMuted, borderRadius: "8px", whiteSpace: "nowrap", border: "none", width: "100%", textAlign: "left" }}><span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>{n.icon}</span>{n.label}</button>)}
        </nav>
        {!isDemo && <button onClick={handleSignOut} style={{ ...btn, display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", margin: "0 8px", fontSize: "13px", fontWeight: 500, background: "transparent", color: C.red, borderRadius: "8px", border: "none", width: "calc(100% - 16px)", textAlign: "left" }}><span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>↪</span>Sign Out</button>}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0 }}>
        {/* Mobile header */}
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "12px", background: C.card, position: "sticky", top: 0, zIndex: 100 }}>
          <style>{`@media (min-width: 769px) { .mob-header { display: none !important; } }`}</style>
          <button className="mob-header" onClick={() => setSidebarOpen(true)} style={{ ...btn, background: C.border, color: C.text, padding: "8px 10px", fontSize: "16px", border: "none", display: "block" }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: "15px" }}>{NAV.find(n => n.id === page)?.label || "FinnTrack"}</span>
        </div>
        <main style={{ flex: 1, padding: "24px 24px 40px", overflow: "auto" }}>
          {page === "dashboard" && <Dashboard transactions={transactions} budgets={budgets} debts={debts} savingsPots={savingsPots} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} setPage={setPage} />}
          {page === "transactions" && <Transactions transactions={transactions} setTransactions={setTransactions} onSave={save} />}
          {page === "savings" && <SavingsPage savingsPots={savingsPots} setSavingsPots={setSavingsPots} onSave={save} />}
          {page === "debts" && <Debts debts={debts} setDebts={setDebts} onSave={save} />}
          {page === "budgets" && <Budgets budgets={budgets} setBudgets={setBudgets} transactions={transactions} currentMonth={currentMonth} onSave={save} />}
          {page === "settings" && <Settings transactions={transactions} debts={debts} budgets={budgets} savingsPots={savingsPots} setTransactions={setTransactions} setDebts={setDebts} setBudgets={setBudgets} setSavingsPots={setSavingsPots} onSave={save} />}
        </main>
      </div>
    </div>
  );
}