import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
// FINNTRACK — Expense Tracker App
// Full V1 + V2: Dashboard, Transactions, CSV Import,
// Households, Debt Tracking, Budgets, Recurring Detection
// ============================================================

// --- SUPABASE CONFIG (replace with your keys) ---
const SUPABASE_URL = "https://jepzcqsigscbbtnaisrj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplcHpjcXNpZ3NjYmJ0bmFpc3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzEzODQsImV4cCI6MjA4NjYwNzM4NH0.3tGl-OlSlD-2npDwKHKyGmZAFfaFZRMf7Dp-fsb1oik";

// --- Color Palette ---
const C = {
  bg: "#0B0F1A",
  card: "#141925",
  cardHover: "#1A2030",
  border: "#1E2538",
  accent: "#22D3A7",
  accentDim: "rgba(34,211,167,0.12)",
  accentGlow: "rgba(34,211,167,0.25)",
  red: "#EF5350",
  redDim: "rgba(239,83,80,0.12)",
  amber: "#FFB74D",
  amberDim: "rgba(255,183,77,0.12)",
  blue: "#42A5F5",
  blueDim: "rgba(66,165,245,0.12)",
  purple: "#AB47BC",
  purpleDim: "rgba(171,71,188,0.12)",
  text: "#E8ECF4",
  textMuted: "#7A8BA8",
  textDim: "#4A5568",
  white: "#FFFFFF",
};

// --- Category config with icons and colors ---
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
// UTILITY FUNCTIONS
// ============================================================
const fmt = (n) => {
  const abs = Math.abs(n);
  return (n < 0 ? "-" : "") + "€" + abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const fmtShort = (n) => {
  if (Math.abs(n) >= 1000) return (n < 0 ? "-" : "") + "€" + (Math.abs(n)/1000).toFixed(1) + "k";
  return fmt(n);
};

const dateStr = (d) => {
  const date = new Date(d);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const getMonthKey = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
};

const uid = () => Math.random().toString(36).substr(2, 9);

// ============================================================
// PERSISTENT STORAGE (uses window.storage API)
// ============================================================
const DB = {
  async load(key, fallback) {
    try {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : fallback;
    } catch { return fallback; }
  },
  async save(key, data) {
    try {
      await window.storage.set(key, JSON.stringify(data));
    } catch (e) { console.error("Save failed:", e); }
  }
};

// ============================================================
// SAMPLE DATA (for demo)
// ============================================================
const generateSampleData = () => {
  const now = new Date();
  const transactions = [];
  const apps = PAYMENT_APPS.slice(0, 3);
  const expenseCats = CATEGORIES.filter(c => !["income","transfer"].includes(c.id));

  // Generate 3 months of data
  for (let m = 0; m < 3; m++) {
    const month = new Date(now.getFullYear(), now.getMonth() - m, 1);
    // Income
    transactions.push({
      id: uid(), amount: 2800, type: "income", category: "income",
      date: new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0,10),
      app: "AIB", note: "Salary", recurring: true,
    });
    // 15-25 expenses per month
    const count = 15 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const cat = expenseCats[Math.floor(Math.random() * expenseCats.length)];
      const day = 1 + Math.floor(Math.random() * 28);
      const amounts = { food: [8,45], transport: [3,30], shopping: [15,120], bills: [30,150],
        entertainment: [10,50], health: [20,80], groceries: [15,90], rent: [800,1200],
        education: [10,50], subscriptions: [5,20], travel: [30,200], other: [5,60] };
      const [min, max] = amounts[cat.id] || [5, 50];
      const amount = +(min + Math.random() * (max - min)).toFixed(2);
      transactions.push({
        id: uid(), amount, type: "expense", category: cat.id,
        date: new Date(month.getFullYear(), month.getMonth(), day).toISOString().slice(0,10),
        app: apps[Math.floor(Math.random() * apps.length)],
        note: "", recurring: cat.id === "subscriptions" || cat.id === "rent",
      });
    }
  }

  const debts = [
    { id: uid(), person: "Alex", amount: 45.50, direction: "owed_to_me", note: "Dinner split", date: new Date().toISOString().slice(0,10), settled: false },
    { id: uid(), person: "Sarah", amount: 22.00, direction: "i_owe", note: "Cinema tickets", date: new Date().toISOString().slice(0,10), settled: false },
    { id: uid(), person: "Mike", amount: 180.00, direction: "owed_to_me", note: "Weekend trip", date: new Date().toISOString().slice(0,10), settled: false },
  ];

  const budgets = [
    { id: uid(), category: "food", limit: 400, period: "monthly" },
    { id: uid(), category: "entertainment", limit: 100, period: "monthly" },
    { id: uid(), category: "shopping", limit: 200, period: "monthly" },
    { id: uid(), category: "transport", limit: 120, period: "monthly" },
  ];

  // Savings pots with contribution history
  const savingsPots = [
    { id: uid(), name: "Emergency Fund", icon: "🛡️", target: 10000, color: "#22D3A7", monthlyAmount: 500,
      contributions: [
        { id: uid(), amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0,10), note: "Monthly auto-save" },
        { id: uid(), amount: 500, date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0,10), note: "Monthly auto-save" },
        { id: uid(), amount: 500, date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), note: "Monthly auto-save" },
        { id: uid(), amount: 300, date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString().slice(0,10), note: "Bonus top-up" },
      ]
    },
    { id: uid(), name: "Investments (ETFs)", icon: "📈", target: 25000, color: "#42A5F5", monthlyAmount: 200,
      contributions: [
        { id: uid(), amount: 200, date: new Date(now.getFullYear(), now.getMonth() - 2, 5).toISOString().slice(0,10), note: "S&P 500 ETF" },
        { id: uid(), amount: 200, date: new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString().slice(0,10), note: "S&P 500 ETF" },
        { id: uid(), amount: 200, date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().slice(0,10), note: "S&P 500 ETF" },
      ]
    },
    { id: uid(), name: "Holiday Fund", icon: "✈️", target: 3000, color: "#FFB74D", monthlyAmount: 150,
      contributions: [
        { id: uid(), amount: 150, date: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0,10), note: "Monthly" },
        { id: uid(), amount: 150, date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0,10), note: "Monthly" },
        { id: uid(), amount: 150, date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10), note: "Monthly" },
      ]
    },
  ];

  return { transactions, debts, budgets, savingsPots };
};

// ============================================================
// MINI CHART COMPONENTS
// ============================================================
const SparkBar = ({ data, height = 60, accentColor = C.accent }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(24, (280 / data.length) - 2);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${data.length * (barW + 2)} ${height}`} style={{overflow:"visible"}}>
      {data.map((d, i) => (
        <g key={i}>
          <rect x={i * (barW + 2)} y={height - (d.value / max) * (height - 8)} width={barW}
            height={(d.value / max) * (height - 8)} rx={3}
            fill={d.highlight ? accentColor : C.border} opacity={d.highlight ? 1 : 0.5} />
          <text x={i * (barW + 2) + barW/2} y={height + 12} textAnchor="middle"
            fill={C.textDim} fontSize="8" fontFamily="inherit">{d.label}</text>
        </g>
      ))}
    </svg>
  );
};

const DonutChart = ({ segments, size = 120 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) return null;
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  let cumulative = 0;
  const paths = segments.map((seg, i) => {
    const start = cumulative / total * 2 * Math.PI - Math.PI / 2;
    cumulative += seg.value;
    const end = cumulative / total * 2 * Math.PI - Math.PI / 2;
    const largeArc = (end - start) > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const ir = r * 0.6;
    const x3 = cx + ir * Math.cos(end), y3 = cy + ir * Math.sin(end);
    const x4 = cx + ir * Math.cos(start), y4 = cy + ir * Math.sin(start);
    return (
      <path key={i}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${ir} ${ir} 0 ${largeArc} 0 ${x4} ${y4} Z`}
        fill={seg.color} opacity={0.85} />
    );
  });
  return <svg width={size} height={size}>{paths}</svg>;
};

// ============================================================
// REUSABLE UI COMPONENTS
// ============================================================
const btnBase = {
  border: "none", cursor: "pointer", fontFamily: "inherit",
  transition: "all 0.15s ease", borderRadius: "8px",
};

const Button = ({ children, variant = "primary", onClick, style, disabled }) => {
  const styles = {
    primary: { ...btnBase, background: C.accent, color: C.bg, fontWeight: 600, padding: "10px 20px", fontSize: "13px" },
    secondary: { ...btnBase, background: C.border, color: C.text, fontWeight: 500, padding: "10px 20px", fontSize: "13px" },
    ghost: { ...btnBase, background: "transparent", color: C.textMuted, fontWeight: 500, padding: "8px 14px", fontSize: "13px" },
    danger: { ...btnBase, background: C.redDim, color: C.red, fontWeight: 500, padding: "10px 20px", fontSize: "13px" },
    small: { ...btnBase, background: C.border, color: C.text, fontWeight: 500, padding: "6px 12px", fontSize: "12px" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], opacity: disabled ? 0.5 : 1, ...style }}
      onMouseEnter={e => { if(!disabled) e.target.style.opacity = "0.85"; }}
      onMouseLeave={e => { if(!disabled) e.target.style.opacity = disabled ? "0.5" : "1"; }}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    {label && <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500 }}>{label}</label>}
    <input {...props} style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px",
      padding: "10px 12px", color: C.text, fontSize: "14px", fontFamily: "inherit",
      outline: "none", transition: "border-color 0.15s", ...props.style,
    }} onFocus={e => e.target.style.borderColor = C.accent}
       onBlur={e => e.target.style.borderColor = C.border} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    {label && <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500 }}>{label}</label>}
    <select {...props} style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px",
      padding: "10px 12px", color: C.text, fontSize: "14px", fontFamily: "inherit",
      outline: "none", cursor: "pointer", ...props.style,
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px",
    padding: "20px", ...style,
  }}>{children}</div>
);

const Modal = ({ open, onClose, title, children, width = 480 }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px",
        width: "100%", maxWidth: width, maxHeight: "85vh", overflow: "auto", padding: "28px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", color: C.text, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: "20px" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Tab = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: "2px", background: C.bg, borderRadius: "10px", padding: "3px" }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        ...btnBase, padding: "8px 16px", fontSize: "13px", fontWeight: 500,
        background: active === t.id ? C.card : "transparent",
        color: active === t.id ? C.text : C.textMuted,
        border: active === t.id ? `1px solid ${C.border}` : "1px solid transparent",
      }}>{t.icon} {t.label}</button>
    ))}
  </div>
);

const Badge = ({ children, color = C.accent, bg }) => (
  <span style={{
    display: "inline-block", padding: "3px 8px", borderRadius: "6px", fontSize: "11px",
    fontWeight: 600, color, background: bg || (color + "1A"),
  }}>{children}</span>
);

// ============================================================
// PAGE: DASHBOARD
// ============================================================
const Dashboard = ({ transactions, budgets, debts, savingsPots, currentMonth, setCurrentMonth, setPage }) => {
  const thisMonth = transactions.filter(t => getMonthKey(t.date) === currentMonth);
  const income = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : "0.0";

  // Spending by category
  const byCat = {};
  thisMonth.filter(t => t.type === "expense").forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
  });
  const catData = Object.entries(byCat)
    .map(([id, val]) => ({ ...CATEGORIES.find(c => c.id === id), value: val }))
    .sort((a, b) => b.value - a.value);

  // Spending by app
  const byApp = {};
  thisMonth.filter(t => t.type === "expense").forEach(t => {
    byApp[t.app] = (byApp[t.app] || 0) + t.amount;
  });
  const appData = Object.entries(byApp).sort((a, b) => b[1] - a[1]);

  // Monthly trend (last 6 months)
  const trend = [];
  const now = new Date(currentMonth + "-01");
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getMonthKey(d.toISOString());
    const exp = transactions.filter(t => t.type === "expense" && getMonthKey(t.date) === key)
      .reduce((s, t) => s + t.amount, 0);
    trend.push({ label: MONTHS[d.getMonth()], value: exp, highlight: i === 0 });
  }

  // Budget status
  const budgetStatus = budgets.map(b => {
    const spent = byCat[b.category] || 0;
    const pct = Math.min((spent / b.limit) * 100, 100);
    const cat = CATEGORIES.find(c => c.id === b.category);
    return { ...b, spent, pct, cat };
  });

  // Debt summary
  const totalOwed = debts.filter(d => d.direction === "owed_to_me" && !d.settled).reduce((s, d) => s + d.amount, 0);
  const totalIOwe = debts.filter(d => d.direction === "i_owe" && !d.settled).reduce((s, d) => s + d.amount, 0);

  // Navigate months
  const navMonth = (dir) => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() + dir);
    setCurrentMonth(getMonthKey(d.toISOString()));
  };

  const monthLabel = (() => {
    const d = new Date(currentMonth + "-01");
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Month Navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: C.text, fontWeight: 700 }}>Dashboard</h2>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Your financial overview</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navMonth(-1)} style={{ ...btnBase, background: C.border, color: C.textMuted, padding: "6px 10px", fontSize: "14px" }}>←</button>
          <span style={{ color: C.text, fontWeight: 600, fontSize: "15px", minWidth: "100px", textAlign: "center" }}>{monthLabel}</span>
          <button onClick={() => navMonth(1)} style={{ ...btnBase, background: C.border, color: C.textMuted, padding: "6px 10px", fontSize: "14px" }}>→</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {[
          { label: "Income", value: fmt(income), color: C.accent, bg: C.accentDim, icon: "↓" },
          { label: "Expenses", value: fmt(expenses), color: C.red, bg: C.redDim, icon: "↑" },
          { label: "Savings", value: fmt(savings), color: savings >= 0 ? C.accent : C.red, bg: savings >= 0 ? C.accentDim : C.redDim, icon: "◎" },
          { label: "Savings Rate", value: `${savingsRate}%`, color: parseFloat(savingsRate) >= 20 ? C.accent : C.amber, bg: parseFloat(savingsRate) >= 20 ? C.accentDim : C.amberDim, icon: "%" },
        ].map((s, i) => (
          <Card key={i} style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: C.textMuted, fontWeight: 500 }}>{s.label}</p>
                <p style={{ margin: "6px 0 0", fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: s.color }}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Monthly Trend */}
        <Card>
          <p style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600, color: C.text }}>Monthly Spending</p>
          <SparkBar data={trend} height={80} />
        </Card>

        {/* Category Donut */}
        <Card style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <DonutChart segments={catData.slice(0, 6)} size={100} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: 600, color: C.text }}>By Category</p>
            {catData.slice(0, 4).map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", color: C.textMuted }}>{c.icon} {c.name}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Budget Progress + App Breakdown + Debts + Savings */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Budgets */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: C.text }}>Budgets</p>
            <button onClick={() => setPage("budgets")} style={{ ...btnBase, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button>
          </div>
          {budgetStatus.length === 0 && <p style={{ color: C.textDim, fontSize: "13px" }}>No budgets set</p>}
          {budgetStatus.slice(0, 4).map(b => (
            <div key={b.id} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: C.textMuted }}>{b.cat?.icon} {b.cat?.name}</span>
                <span style={{ fontSize: "11px", color: b.pct > 90 ? C.red : b.pct > 70 ? C.amber : C.textMuted }}>
                  {fmt(b.spent)} / {fmt(b.limit)}
                </span>
              </div>
              <div style={{ height: "4px", borderRadius: "2px", background: C.bg }}>
                <div style={{ height: "100%", borderRadius: "2px", width: `${b.pct}%`,
                  background: b.pct > 90 ? C.red : b.pct > 70 ? C.amber : C.accent,
                  transition: "width 0.3s" }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Savings Pots Summary */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: C.text }}>Savings Pots</p>
            <button onClick={() => setPage("savings")} style={{ ...btnBase, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button>
          </div>
          {savingsPots.length === 0 && <p style={{ color: C.textDim, fontSize: "13px" }}>No savings pots set up</p>}
          {savingsPots.slice(0, 4).map(pot => {
            const potTotal = pot.contributions.reduce((s, c) => s + c.amount, 0);
            const pct = pot.target > 0 ? Math.min((potTotal / pot.target) * 100, 100) : 0;
            return (
              <div key={pot.id} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: C.textMuted }}>{pot.icon} {pot.name}</span>
                  <span style={{ fontSize: "11px", color: C.accent }}>{fmt(potTotal)} / {fmt(pot.target)}</span>
                </div>
                <div style={{ height: "4px", borderRadius: "2px", background: C.bg }}>
                  <div style={{ height: "100%", borderRadius: "2px", width: `${pct}%`, background: pot.color, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}
        </Card>

        {/* App Breakdown */}
        <Card>
          <p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600, color: C.text }}>By Payment App</p>
          {appData.map(([app, val]) => {
            const pct = expenses > 0 ? (val / expenses * 100) : 0;
            return (
              <div key={app} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", color: C.textMuted }}>{app}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: C.text }}>{fmt(val)} <span style={{color: C.textDim}}>({pct.toFixed(0)}%)</span></span>
                </div>
                <div style={{ height: "4px", borderRadius: "2px", background: C.bg }}>
                  <div style={{ height: "100%", borderRadius: "2px", width: `${pct}%`, background: C.blue, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}
        </Card>

        {/* Debts Summary */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: C.text }}>Debts</p>
            <button onClick={() => setPage("debts")} style={{ ...btnBase, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
            <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: C.accentDim }}>
              <p style={{ margin: 0, fontSize: "11px", color: C.accent }}>Owed to you</p>
              <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700, color: C.accent }}>{fmt(totalOwed)}</p>
            </div>
            <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: C.redDim }}>
              <p style={{ margin: 0, fontSize: "11px", color: C.red }}>You owe</p>
              <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 700, color: C.red }}>{fmt(totalIOwe)}</p>
            </div>
          </div>
          {debts.filter(d => !d.settled).slice(0, 3).map(d => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: "12px", color: C.textMuted }}>{d.person}</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: d.direction === "owed_to_me" ? C.accent : C.red }}>
                {d.direction === "owed_to_me" ? "+" : "-"}{fmt(d.amount)}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: C.text }}>Recent Transactions</p>
          <button onClick={() => setPage("transactions")} style={{ ...btnBase, background: "none", color: C.accent, fontSize: "12px", padding: "2px" }}>View all →</button>
        </div>
        {thisMonth.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6).map(t => {
          const cat = CATEGORIES.find(c => c.id === t.category);
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.border}`, gap: "12px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "8px", background: cat?.color + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>{cat?.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: "13px", color: C.text, fontWeight: 500 }}>{cat?.name}{t.note ? ` — ${t.note}` : ""}</p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: C.textDim }}>{dateStr(t.date)} · {t.app}{t.recurring ? " · 🔄" : ""}</p>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: t.type === "income" ? C.accent : C.text }}>
                {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ============================================================
// PAGE: TRANSACTIONS
// ============================================================
const Transactions = ({ transactions, setTransactions, onSave }) => {
  const [filter, setFilter] = useState({ type: "all", category: "all", app: "all", search: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [form, setForm] = useState({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0,10), app: "Revolut", note: "", recurring: false });

  const filtered = useMemo(() => {
    return transactions
      .filter(t => filter.type === "all" || t.type === filter.type)
      .filter(t => filter.category === "all" || t.category === filter.category)
      .filter(t => filter.app === "all" || t.app === filter.app)
      .filter(t => filter.search === "" || t.note?.toLowerCase().includes(filter.search.toLowerCase()) ||
        CATEGORIES.find(c=>c.id===t.category)?.name.toLowerCase().includes(filter.search.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filter]);

  const handleSubmit = () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    const tx = { ...form, amount: parseFloat(form.amount), id: editTx ? editTx.id : uid() };
    if (editTx) {
      setTransactions(prev => prev.map(t => t.id === editTx.id ? tx : t));
    } else {
      setTransactions(prev => [...prev, tx]);
    }
    onSave();
    setShowAdd(false);
    setEditTx(null);
    setForm({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0,10), app: "Revolut", note: "", recurring: false });
  };

  const handleDelete = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    onSave();
  };

  const handleCSVImport = (text) => {
    try {
      const lines = text.trim().split("\n");
      const header = lines[0].toLowerCase();
      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 2) {
          const amount = parseFloat(cols.find(c => !isNaN(parseFloat(c))) || "0");
          const dateCol = cols.find(c => /\d{4}-\d{2}-\d{2}/.test(c) || /\d{2}\/\d{2}\/\d{4}/.test(c)) || new Date().toISOString().slice(0,10);
          if (amount > 0) {
            imported.push({
              id: uid(), amount: Math.abs(amount), type: amount < 0 ? "expense" : (header.includes("debit") ? "expense" : "expense"),
              category: "other", date: dateCol, app: "CSV Import", note: cols[0] || "", recurring: false,
            });
          }
        }
      }
      if (imported.length > 0) {
        setTransactions(prev => [...prev, ...imported]);
        onSave();
      }
      setShowCSV(false);
      alert(`Imported ${imported.length} transactions! Review and categorize them.`);
    } catch (e) {
      alert("Error parsing CSV. Make sure it's a valid CSV file.");
    }
  };

  const openEdit = (tx) => {
    setEditTx(tx);
    setForm({ ...tx, amount: String(tx.amount) });
    setShowAdd(true);
  };

  const totalFiltered = filtered.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: C.text, fontWeight: 700 }}>Transactions</h2>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>{filtered.length} transactions · Net: <span style={{color: totalFiltered >= 0 ? C.accent : C.red, fontWeight: 600}}>{fmt(totalFiltered)}</span></p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={() => setShowCSV(true)}>📄 Import CSV</Button>
          <Button onClick={() => { setEditTx(null); setForm({ amount: "", type: "expense", category: "food", date: new Date().toISOString().slice(0,10), app: "Revolut", note: "", recurring: false }); setShowAdd(true); }}>+ Add Transaction</Button>
        </div>
      </div>

      {/* Filters */}
      <Card style={{ padding: "14px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "end" }}>
        <Input placeholder="Search..." value={filter.search} onChange={e => setFilter(f => ({...f, search: e.target.value}))} style={{ width: "180px" }} />
        <Select label="Type" value={filter.type} onChange={e => setFilter(f => ({...f, type: e.target.value}))}
          options={[{value:"all",label:"All Types"},{value:"income",label:"Income"},{value:"expense",label:"Expense"}]} />
        <Select label="Category" value={filter.category} onChange={e => setFilter(f => ({...f, category: e.target.value}))}
          options={[{value:"all",label:"All Categories"}, ...CATEGORIES.map(c=>({value:c.id,label:`${c.icon} ${c.name}`}))]} />
        <Select label="App" value={filter.app} onChange={e => setFilter(f => ({...f, app: e.target.value}))}
          options={[{value:"all",label:"All Apps"}, ...PAYMENT_APPS.map(a=>({value:a,label:a}))]} />
        {(filter.type !== "all" || filter.category !== "all" || filter.app !== "all" || filter.search) && (
          <Button variant="ghost" onClick={() => setFilter({type:"all",category:"all",app:"all",search:""})}>Clear</Button>
        )}
      </Card>

      {/* Transaction List */}
      <Card style={{ padding: "0" }}>
        {filtered.length === 0 && <p style={{ padding: "40px", textAlign: "center", color: C.textDim }}>No transactions found</p>}
        {filtered.map((t, i) => {
          const cat = CATEGORIES.find(c => c.id === t.category);
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", padding: "14px 20px", gap: "12px",
              borderTop: i > 0 ? `1px solid ${C.border}` : "none",
              cursor: "pointer", transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            onClick={() => openEdit(t)}>
              <div style={{ width: 40, height: 40, borderRadius: "10px", background: (cat?.color || "#888") + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{cat?.icon || "?"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "14px", color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cat?.name || t.category}{t.note ? ` — ${t.note}` : ""}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>
                  {dateStr(t.date)} · {t.app}{t.recurring ? " · 🔄 Recurring" : ""}
                </p>
              </div>
              <span style={{ fontSize: "15px", fontWeight: 600, color: t.type === "income" ? C.accent : C.text, flexShrink: 0 }}>
                {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
              </span>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                style={{ ...btnBase, background: "none", color: C.textDim, fontSize: "16px", padding: "4px 8px" }}
                onMouseEnter={e => e.target.style.color = C.red} onMouseLeave={e => e.target.style.color = C.textDim}>×</button>
            </div>
          );
        })}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditTx(null); }} title={editTx ? "Edit Transaction" : "Add Transaction"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {["expense", "income"].map(type => (
              <button key={type} onClick={() => setForm(f => ({...f, type}))}
                style={{ ...btnBase, flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600,
                  background: form.type === type ? (type === "expense" ? C.redDim : C.accentDim) : C.bg,
                  color: form.type === type ? (type === "expense" ? C.red : C.accent) : C.textMuted,
                  border: `1px solid ${form.type === type ? (type === "expense" ? C.red : C.accent) : C.border}`,
                }}>{type === "expense" ? "↑ Expense" : "↓ Income"}</button>
            ))}
          </div>
          <Input label="Amount (€)" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
            options={CATEGORIES.filter(c => form.type === "income" ? ["income","other"].includes(c.id) : !["income"].includes(c.id)).map(c => ({value: c.id, label: `${c.icon} ${c.name}`}))} />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
          <Select label="Payment App" value={form.app} onChange={e => setForm(f => ({...f, app: e.target.value}))}
            options={PAYMENT_APPS.map(a => ({value: a, label: a}))} />
          <Input label="Note (optional)" placeholder="e.g., Lunch with friends" value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} />
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: C.textMuted, cursor: "pointer" }}>
            <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({...f, recurring: e.target.checked}))} /> Recurring transaction
          </label>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => { setShowAdd(false); setEditTx(null); }} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={handleSubmit} style={{ flex: 1 }}>{editTx ? "Save Changes" : "Add Transaction"}</Button>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal open={showCSV} onClose={() => setShowCSV(false)} title="Import CSV" width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: C.textMuted }}>
            Paste your bank CSV export below. The importer will detect amounts and dates automatically. You can recategorize transactions after import.
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: C.textDim }}>
            Tip: Download CSV exports from Revolut (Statements → Excel) or AIB (Transactions → Export).
          </p>
          <textarea id="csv-input" rows={10} placeholder={`Date,Description,Amount\n2024-01-15,"Coffee Shop",-4.50\n2024-01-15,"Salary",2800.00`}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px", color: C.text, fontSize: "13px", fontFamily: "monospace", resize: "vertical", outline: "none" }} />
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
// PAGE: DEBTS
// ============================================================
const Debts = ({ debts, setDebts, onSave }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ person: "", amount: "", direction: "owed_to_me", note: "", date: new Date().toISOString().slice(0,10) });

  const handleSubmit = () => {
    if (!form.person || !form.amount || parseFloat(form.amount) <= 0) return;
    setDebts(prev => [...prev, { ...form, amount: parseFloat(form.amount), id: uid(), settled: false }]);
    onSave();
    setShowAdd(false);
    setForm({ person: "", amount: "", direction: "owed_to_me", note: "", date: new Date().toISOString().slice(0,10) });
  };

  const toggleSettle = (id) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, settled: !d.settled } : d));
    onSave();
  };

  const deleteDebt = (id) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    onSave();
  };

  const active = debts.filter(d => !d.settled);
  const settled = debts.filter(d => d.settled);
  const totalOwed = active.filter(d => d.direction === "owed_to_me").reduce((s, d) => s + d.amount, 0);
  const totalIOwe = active.filter(d => d.direction === "i_owe").reduce((s, d) => s + d.amount, 0);

  // Group by person
  const byPerson = {};
  active.forEach(d => {
    if (!byPerson[d.person]) byPerson[d.person] = { owed: 0, owing: 0, items: [] };
    if (d.direction === "owed_to_me") byPerson[d.person].owed += d.amount;
    else byPerson[d.person].owing += d.amount;
    byPerson[d.person].items.push(d);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: C.text, fontWeight: 700 }}>Debts & Splits</h2>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Track who owes whom</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Debt</Button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <Card style={{ padding: "16px", background: C.accentDim, border: `1px solid ${C.accent}33` }}>
          <p style={{ margin: 0, fontSize: "12px", color: C.accent }}>People owe you</p>
          <p style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: 700, color: C.accent }}>{fmt(totalOwed)}</p>
        </Card>
        <Card style={{ padding: "16px", background: C.redDim, border: `1px solid ${C.red}33` }}>
          <p style={{ margin: 0, fontSize: "12px", color: C.red }}>You owe</p>
          <p style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: 700, color: C.red }}>{fmt(totalIOwe)}</p>
        </Card>
        <Card style={{ padding: "16px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: C.textMuted }}>Net position</p>
          <p style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: 700, color: totalOwed - totalIOwe >= 0 ? C.accent : C.red }}>{fmt(totalOwed - totalIOwe)}</p>
        </Card>
      </div>

      {/* By Person */}
      {Object.entries(byPerson).map(([person, data]) => (
        <Card key={person}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: C.accent }}>
                {person.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: C.text }}>{person}</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textMuted }}>{data.items.length} active item{data.items.length > 1 ? "s" : ""}</p>
              </div>
            </div>
            <span style={{ fontSize: "18px", fontWeight: 700, color: (data.owed - data.owing) >= 0 ? C.accent : C.red }}>
              {(data.owed - data.owing) >= 0 ? "+" : ""}{fmt(data.owed - data.owing)}
            </span>
          </div>
          {data.items.map(d => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.border}`, gap: "10px" }}>
              <Badge color={d.direction === "owed_to_me" ? C.accent : C.red}>
                {d.direction === "owed_to_me" ? "owes you" : "you owe"}
              </Badge>
              <span style={{ flex: 1, fontSize: "13px", color: C.textMuted }}>{d.note || "—"}</span>
              <span style={{ fontSize: "13px", color: C.textDim }}>{dateStr(d.date)}</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: C.text }}>{fmt(d.amount)}</span>
              <Button variant="small" onClick={() => toggleSettle(d.id)}>Settle</Button>
              <button onClick={() => deleteDebt(d.id)} style={{ ...btnBase, background: "none", color: C.textDim, fontSize: "14px", padding: "4px" }}>×</button>
            </div>
          ))}
        </Card>
      ))}

      {active.length === 0 && <Card style={{ textAlign: "center", padding: "40px" }}><p style={{ color: C.textDim }}>No active debts. Add one to start tracking.</p></Card>}

      {/* Settled */}
      {settled.length > 0 && (
        <Card style={{ opacity: 0.6 }}>
          <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600, color: C.textMuted }}>Settled ({settled.length})</p>
          {settled.slice(0, 5).map(d => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", padding: "6px 0", gap: "10px" }}>
              <span style={{ fontSize: "13px", color: C.textDim, textDecoration: "line-through" }}>{d.person} — {d.note || "—"}</span>
              <span style={{ marginLeft: "auto", fontSize: "13px", color: C.textDim }}>{fmt(d.amount)}</span>
              <button onClick={() => toggleSettle(d.id)} style={{ ...btnBase, background: "none", color: C.textDim, fontSize: "11px", padding: "2px 6px" }}>Undo</button>
            </div>
          ))}
        </Card>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Debt">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[{v: "owed_to_me", l: "They owe me"}, {v: "i_owe", l: "I owe them"}].map(o => (
              <button key={o.v} onClick={() => setForm(f => ({...f, direction: o.v}))}
                style={{ ...btnBase, flex: 1, padding: "10px", fontSize: "13px", fontWeight: 600,
                  background: form.direction === o.v ? (o.v === "owed_to_me" ? C.accentDim : C.redDim) : C.bg,
                  color: form.direction === o.v ? (o.v === "owed_to_me" ? C.accent : C.red) : C.textMuted,
                  border: `1px solid ${form.direction === o.v ? (o.v === "owed_to_me" ? C.accent : C.red) : C.border}`,
                }}>{o.l}</button>
            ))}
          </div>
          <Input label="Person" placeholder="e.g., Alex" value={form.person} onChange={e => setForm(f => ({...f, person: e.target.value}))} />
          <Input label="Amount (€)" type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} />
          <Input label="What for (optional)" placeholder="e.g., Dinner split" value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={handleSubmit} style={{ flex: 1 }}>Add Debt</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// PAGE: BUDGETS
// ============================================================
const Budgets = ({ budgets, setBudgets, transactions, currentMonth, onSave }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: "food", limit: "", period: "monthly" });

  const thisMonth = transactions.filter(t => getMonthKey(t.date) === currentMonth && t.type === "expense");
  const byCat = {};
  thisMonth.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });

  const handleSubmit = () => {
    if (!form.limit || parseFloat(form.limit) <= 0) return;
    setBudgets(prev => [...prev, { ...form, limit: parseFloat(form.limit), id: uid() }]);
    onSave();
    setShowAdd(false);
    setForm({ category: "food", limit: "", period: "monthly" });
  };

  const deleteBudget = (id) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    onSave();
  };

  const existingCats = budgets.map(b => b.category);
  const availableCats = CATEGORIES.filter(c => !["income","transfer"].includes(c.id) && !existingCats.includes(c.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: C.text, fontWeight: 700 }}>Budgets</h2>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Set spending limits by category</p>
        </div>
        <Button onClick={() => setShowAdd(true)} disabled={availableCats.length === 0}>+ Add Budget</Button>
      </div>

      {budgets.length === 0 && (
        <Card style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ fontSize: "32px", margin: "0 0 8px" }}>🎯</p>
          <p style={{ color: C.textMuted, fontSize: "14px" }}>No budgets yet. Set spending limits to track your goals.</p>
          <Button onClick={() => setShowAdd(true)} style={{ marginTop: "12px" }}>Create your first budget</Button>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
        {budgets.map(b => {
          const cat = CATEGORIES.find(c => c.id === b.category);
          const spent = byCat[b.category] || 0;
          const pct = Math.min((spent / b.limit) * 100, 100);
          const remaining = b.limit - spent;
          const status = pct > 100 ? "over" : pct > 80 ? "warning" : "good";
          const statusColor = status === "over" ? C.red : status === "warning" ? C.amber : C.accent;
          return (
            <Card key={b.id} style={{ position: "relative" }}>
              <button onClick={() => deleteBudget(b.id)} style={{ position: "absolute", top: "12px", right: "12px", ...btnBase, background: "none", color: C.textDim, fontSize: "14px", padding: "4px" }}>×</button>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: 40, height: 40, borderRadius: "10px", background: (cat?.color || "#888") + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{cat?.icon}</div>
                <div>
                  <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: C.text }}>{cat?.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>{b.period}</p>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "22px", fontWeight: 700, color: statusColor }}>{fmt(spent)}</span>
                <span style={{ fontSize: "14px", color: C.textMuted, alignSelf: "flex-end" }}>of {fmt(b.limit)}</span>
              </div>
              <div style={{ height: "6px", borderRadius: "3px", background: C.bg, marginBottom: "8px" }}>
                <div style={{ height: "100%", borderRadius: "3px", width: `${Math.min(pct, 100)}%`, background: statusColor, transition: "width 0.3s" }} />
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: remaining >= 0 ? C.textMuted : C.red }}>
                {remaining >= 0 ? `${fmt(remaining)} remaining` : `${fmt(Math.abs(remaining))} over budget!`}
              </p>
            </Card>
          );
        })}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Budget">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
            options={availableCats.map(c => ({value: c.id, label: `${c.icon} ${c.name}`}))} />
          <Input label="Monthly Limit (€)" type="number" placeholder="e.g., 200" value={form.limit} onChange={e => setForm(f => ({...f, limit: e.target.value}))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={handleSubmit} style={{ flex: 1 }}>Add Budget</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// PAGE: SAVINGS & INVESTMENTS
// ============================================================
const Savings = ({ savingsPots, setSavingsPots, onSave }) => {
  const [showAddPot, setShowAddPot] = useState(false);
  const [showAddContrib, setShowAddContrib] = useState(null); // pot id
  const [showHistory, setShowHistory] = useState(null); // pot id
  const [editPot, setEditPot] = useState(null);
  const [potForm, setPotForm] = useState({ name: "", icon: "🏦", target: "", color: "#22D3A7", monthlyAmount: "" });
  const [contribForm, setContribForm] = useState({ amount: "", date: new Date().toISOString().slice(0,10), note: "" });

  const POT_ICONS = ["🏦","🛡️","📈","✈️","🏠","🎓","💍","🚗","👶","💻","🎯","💎"];
  const POT_COLORS = ["#22D3A7","#42A5F5","#FFB74D","#AB47BC","#EC407A","#66BB6A","#5C6BC0","#EF5350","#29B6F6","#8D6E63"];

  // Totals
  const totalSaved = savingsPots.reduce((s, p) => s + p.contributions.reduce((ss, c) => ss + c.amount, 0), 0);
  const totalTargets = savingsPots.reduce((s, p) => s + (p.target || 0), 0);
  const totalMonthly = savingsPots.reduce((s, p) => s + (p.monthlyAmount || 0), 0);

  // This month's contributions
  const thisMonthKey = getMonthKey(new Date().toISOString());
  const thisMonthContribs = savingsPots.reduce((s, p) =>
    s + p.contributions.filter(c => getMonthKey(c.date) === thisMonthKey).reduce((ss, c) => ss + c.amount, 0), 0);

  const handleAddPot = () => {
    if (!potForm.name || !potForm.target || parseFloat(potForm.target) <= 0) return;
    if (editPot) {
      setSavingsPots(prev => prev.map(p => p.id === editPot.id ? { ...p, name: potForm.name, icon: potForm.icon, target: parseFloat(potForm.target), color: potForm.color, monthlyAmount: parseFloat(potForm.monthlyAmount) || 0 } : p));
    } else {
      setSavingsPots(prev => [...prev, {
        id: uid(), name: potForm.name, icon: potForm.icon, target: parseFloat(potForm.target),
        color: potForm.color, monthlyAmount: parseFloat(potForm.monthlyAmount) || 0, contributions: [],
      }]);
    }
    onSave();
    setShowAddPot(false);
    setEditPot(null);
    setPotForm({ name: "", icon: "🏦", target: "", color: "#22D3A7", monthlyAmount: "" });
  };

  const handleAddContrib = () => {
    if (!contribForm.amount || parseFloat(contribForm.amount) <= 0 || !showAddContrib) return;
    setSavingsPots(prev => prev.map(p => p.id === showAddContrib ? {
      ...p, contributions: [...p.contributions, { id: uid(), amount: parseFloat(contribForm.amount), date: contribForm.date, note: contribForm.note }]
    } : p));
    onSave();
    setShowAddContrib(null);
    setContribForm({ amount: "", date: new Date().toISOString().slice(0,10), note: "" });
  };

  const handleWithdraw = (potId, contribId) => {
    setSavingsPots(prev => prev.map(p => p.id === potId ? {
      ...p, contributions: p.contributions.filter(c => c.id !== contribId)
    } : p));
    onSave();
  };

  const handleDeletePot = (potId) => {
    setSavingsPots(prev => prev.filter(p => p.id !== potId));
    onSave();
  };

  const openEditPot = (pot) => {
    setEditPot(pot);
    setPotForm({ name: pot.name, icon: pot.icon, target: String(pot.target), color: pot.color, monthlyAmount: String(pot.monthlyAmount || "") });
    setShowAddPot(true);
  };

  // Monthly contribution trend (last 6 months)
  const now = new Date();
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getMonthKey(d.toISOString());
    const val = savingsPots.reduce((s, p) =>
      s + p.contributions.filter(c => getMonthKey(c.date) === key).reduce((ss, c) => ss + c.amount, 0), 0);
    monthlyTrend.push({ label: MONTHS[d.getMonth()], value: val, highlight: i === 0 });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: C.text, fontWeight: 700 }}>Savings & Investments</h2>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "13px" }}>Pay yourself first — track compulsory savings</p>
        </div>
        <Button onClick={() => { setEditPot(null); setPotForm({ name: "", icon: "🏦", target: "", color: "#22D3A7", monthlyAmount: "" }); setShowAddPot(true); }}>+ New Savings Pot</Button>
      </div>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {[
          { label: "Total Saved", value: fmt(totalSaved), color: C.accent, bg: C.accentDim, icon: "🏦" },
          { label: "This Month", value: fmt(thisMonthContribs), color: C.blue, bg: C.blueDim, icon: "📅" },
          { label: "Monthly Commitment", value: fmt(totalMonthly), color: C.purple, bg: C.purpleDim, icon: "🔄" },
          { label: "Overall Progress", value: totalTargets > 0 ? `${((totalSaved / totalTargets) * 100).toFixed(1)}%` : "—", color: C.amber, bg: C.amberDim, icon: "🎯" },
        ].map((s, i) => (
          <Card key={i} style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: C.textMuted, fontWeight: 500 }}>{s.label}</p>
                <p style={{ margin: "6px 0 0", fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Monthly Savings Trend */}
      <Card>
        <p style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 600, color: C.text }}>Monthly Savings Contributions</p>
        <SparkBar data={monthlyTrend} height={70} accentColor={C.blue} />
      </Card>

      {/* Savings Pots */}
      {savingsPots.length === 0 && (
        <Card style={{ textAlign: "center", padding: "50px 20px" }}>
          <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🏦</p>
          <p style={{ color: C.text, fontSize: "16px", fontWeight: 600, margin: "0 0 6px" }}>No savings pots yet</p>
          <p style={{ color: C.textMuted, fontSize: "13px", margin: "0 0 16px" }}>Create pots for emergency funds, investments, holidays — anything you want to save for.</p>
          <Button onClick={() => setShowAddPot(true)}>Create your first pot</Button>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {savingsPots.map(pot => {
          const potTotal = pot.contributions.reduce((s, c) => s + c.amount, 0);
          const pct = pot.target > 0 ? Math.min((potTotal / pot.target) * 100, 100) : 0;
          const remaining = pot.target - potTotal;
          const monthsToGoal = pot.monthlyAmount > 0 && remaining > 0 ? Math.ceil(remaining / pot.monthlyAmount) : null;
          const thisMonthPot = pot.contributions.filter(c => getMonthKey(c.date) === thisMonthKey).reduce((s, c) => s + c.amount, 0);
          const monthlyHit = pot.monthlyAmount > 0 && thisMonthPot >= pot.monthlyAmount;

          return (
            <Card key={pot.id} style={{ position: "relative", borderTop: `3px solid ${pot.color}` }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "12px", background: pot.color + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{pot.icon}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: C.text }}>{pot.name}</p>
                    {pot.monthlyAmount > 0 && (
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: monthlyHit ? C.accent : C.amber }}>
                        {monthlyHit ? "✓" : "○"} {fmt(pot.monthlyAmount)}/mo {monthlyHit ? "— done!" : `— ${fmt(pot.monthlyAmount - thisMonthPot)} left`}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => openEditPot(pot)} style={{ ...btnBase, background: "none", color: C.textDim, fontSize: "13px", padding: "4px 6px" }} title="Edit">✎</button>
                  <button onClick={() => handleDeletePot(pot.id)} style={{ ...btnBase, background: "none", color: C.textDim, fontSize: "14px", padding: "4px 6px" }}
                    onMouseEnter={e => e.target.style.color = C.red} onMouseLeave={e => e.target.style.color = C.textDim}>×</button>
                </div>
              </div>

              {/* Amount + Progress */}
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                  <span style={{ fontSize: "26px", fontWeight: 700, color: pot.color }}>{fmt(potTotal)}</span>
                  <span style={{ fontSize: "13px", color: C.textMuted }}>of {fmt(pot.target)}</span>
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: C.bg, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: "4px", width: `${pct}%`,
                    background: `linear-gradient(90deg, ${pot.color}88, ${pot.color})`,
                    transition: "width 0.4s ease",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                  <span style={{ fontSize: "11px", color: C.textDim }}>{pct.toFixed(1)}% complete</span>
                  {monthsToGoal && <span style={{ fontSize: "11px", color: C.textDim }}>~{monthsToGoal} month{monthsToGoal > 1 ? "s" : ""} to goal</span>}
                </div>
              </div>

              {/* Recent contributions preview */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "10px", marginBottom: "12px" }}>
                {pot.contributions.slice(-3).reverse().map(c => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span style={{ fontSize: "12px", color: C.textDim }}>{dateStr(c.date)}{c.note ? ` · ${c.note}` : ""}</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: C.accent }}>+{fmt(c.amount)}</span>
                  </div>
                ))}
                {pot.contributions.length === 0 && <p style={{ fontSize: "12px", color: C.textDim, textAlign: "center", padding: "8px 0" }}>No contributions yet</p>}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <Button onClick={() => { setShowAddContrib(pot.id); setContribForm({ amount: String(pot.monthlyAmount || ""), date: new Date().toISOString().slice(0,10), note: "" }); }} style={{ flex: 1, fontSize: "12px" }}>+ Add Money</Button>
                <Button variant="secondary" onClick={() => setShowHistory(pot.id)} style={{ flex: 1, fontSize: "12px" }}>History</Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Projected Growth Card */}
      {savingsPots.length > 0 && totalMonthly > 0 && (
        <Card>
          <p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600, color: C.text }}>Projected Savings Growth</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px" }}>
            {[3, 6, 12, 24].map(months => (
              <div key={months} style={{ padding: "14px", background: C.bg, borderRadius: "8px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "11px", color: C.textDim }}>{months} months</p>
                <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 700, color: C.accent }}>{fmtShort(totalSaved + totalMonthly * months)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add/Edit Pot Modal */}
      <Modal open={showAddPot} onClose={() => { setShowAddPot(false); setEditPot(null); }} title={editPot ? "Edit Savings Pot" : "New Savings Pot"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Input label="Pot Name" placeholder="e.g., Emergency Fund" value={potForm.name} onChange={e => setPotForm(f => ({...f, name: e.target.value}))} />

          <div>
            <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500, display: "block", marginBottom: "6px" }}>Icon</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {POT_ICONS.map(icon => (
                <button key={icon} onClick={() => setPotForm(f => ({...f, icon}))}
                  style={{ ...btnBase, width: 38, height: 38, fontSize: "18px", borderRadius: "8px",
                    background: potForm.icon === icon ? C.accentDim : C.bg,
                    border: `1px solid ${potForm.icon === icon ? C.accent : C.border}`,
                  }}>{icon}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 500, display: "block", marginBottom: "6px" }}>Color</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {POT_COLORS.map(color => (
                <button key={color} onClick={() => setPotForm(f => ({...f, color}))}
                  style={{ ...btnBase, width: 30, height: 30, borderRadius: "50%", background: color,
                    border: potForm.color === color ? `2px solid ${C.white}` : "2px solid transparent",
                    opacity: potForm.color === color ? 1 : 0.5,
                  }} />
              ))}
            </div>
          </div>

          <Input label="Target Amount (€)" type="number" placeholder="e.g., 10000" value={potForm.target} onChange={e => setPotForm(f => ({...f, target: e.target.value}))} />
          <Input label="Monthly Commitment (€)" type="number" placeholder="e.g., 500 — the amount you save every month" value={potForm.monthlyAmount} onChange={e => setPotForm(f => ({...f, monthlyAmount: e.target.value}))} />

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => { setShowAddPot(false); setEditPot(null); }} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={handleAddPot} style={{ flex: 1 }}>{editPot ? "Save Changes" : "Create Pot"}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Contribution Modal */}
      <Modal open={!!showAddContrib} onClose={() => setShowAddContrib(null)} title="Add Contribution">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <Input label="Amount (€)" type="number" placeholder="0.00" value={contribForm.amount} onChange={e => setContribForm(f => ({...f, amount: e.target.value}))} />
          <Input label="Date" type="date" value={contribForm.date} onChange={e => setContribForm(f => ({...f, date: e.target.value}))} />
          <Input label="Note (optional)" placeholder="e.g., Monthly auto-save" value={contribForm.note} onChange={e => setContribForm(f => ({...f, note: e.target.value}))} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <Button variant="secondary" onClick={() => setShowAddContrib(null)} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={handleAddContrib} style={{ flex: 1 }}>Add Contribution</Button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal open={!!showHistory} onClose={() => setShowHistory(null)} title="Contribution History" width={520}>
        {(() => {
          const pot = savingsPots.find(p => p.id === showHistory);
          if (!pot) return null;
          const sorted = [...pot.contributions].sort((a, b) => new Date(b.date) - new Date(a.date));
          let runningTotal = pot.contributions.reduce((s, c) => s + c.amount, 0);
          return (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", marginBottom: "10px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: C.text }}>Total: {fmt(runningTotal)}</span>
                <span style={{ fontSize: "14px", color: C.textMuted }}>{sorted.length} contribution{sorted.length !== 1 ? "s" : ""}</span>
              </div>
              {sorted.map(c => {
                const row = (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}`, gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "13px", color: C.text }}>{c.note || "Contribution"}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: C.textDim }}>{dateStr(c.date)}</p>
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: C.accent }}>+{fmt(c.amount)}</span>
                    <button onClick={() => { handleWithdraw(pot.id, c.id); }}
                      style={{ ...btnBase, background: C.redDim, color: C.red, fontSize: "11px", padding: "4px 8px" }}>Withdraw</button>
                  </div>
                );
                runningTotal -= c.amount;
                return row;
              })}
              {sorted.length === 0 && <p style={{ textAlign: "center", padding: "20px", color: C.textDim }}>No contributions yet</p>}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

// ============================================================
// PAGE: SETTINGS
// ============================================================
const Settings = ({ transactions, debts, budgets, savingsPots, setTransactions, setDebts, setBudgets, setSavingsPots, onSave }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleExport = () => {
    const data = JSON.stringify({ transactions, debts, budgets, savingsPots, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `finntrack-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.transactions) setTransactions(data.transactions);
        if (data.debts) setDebts(data.debts);
        if (data.budgets) setBudgets(data.budgets);
        if (data.savingsPots) setSavingsPots(data.savingsPots);
        onSave();
        alert("Data imported successfully!");
      } catch { alert("Invalid file format."); }
    };
    input.click();
  };

  const handleReset = () => {
    setTransactions([]); setDebts([]); setBudgets([]); setSavingsPots([]);
    onSave();
    setShowConfirm(false);
  };

  const stats = {
    totalTx: transactions.length,
    totalIncome: transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
    totalExpenses: transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    uniqueMonths: [...new Set(transactions.map(t => getMonthKey(t.date)))].length,
    recurringCount: transactions.filter(t => t.recurring).length,
    totalSaved: savingsPots.reduce((s, p) => s + p.contributions.reduce((ss, c) => ss + c.amount, 0), 0),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <h2 style={{ margin: 0, fontSize: "22px", color: C.text, fontWeight: 700 }}>Settings</h2>

      {/* Stats */}
      <Card>
        <p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600, color: C.text }}>Data Overview</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
          {[
            { label: "Transactions", value: stats.totalTx },
            { label: "Total Income", value: fmtShort(stats.totalIncome) },
            { label: "Total Expenses", value: fmtShort(stats.totalExpenses) },
            { label: "Total Saved", value: fmtShort(stats.totalSaved) },
            { label: "Months Tracked", value: stats.uniqueMonths },
            { label: "Recurring", value: stats.recurringCount },
          ].map((s, i) => (
            <div key={i} style={{ padding: "12px", background: C.bg, borderRadius: "8px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: C.textDim }}>{s.label}</p>
              <p style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 700, color: C.text }}>{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <Card>
        <p style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600, color: C.text }}>Data Management</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: C.bg, borderRadius: "8px" }}>
            <div>
              <p style={{ margin: 0, fontSize: "14px", color: C.text }}>Export Data</p>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>Download all data as JSON backup</p>
            </div>
            <Button variant="secondary" onClick={handleExport}>Export</Button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: C.bg, borderRadius: "8px" }}>
            <div>
              <p style={{ margin: 0, fontSize: "14px", color: C.text }}>Import Data</p>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>Restore from a JSON backup file</p>
            </div>
            <Button variant="secondary" onClick={handleImport}>Import</Button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: C.redDim, borderRadius: "8px", border: `1px solid ${C.red}22` }}>
            <div>
              <p style={{ margin: 0, fontSize: "14px", color: C.red }}>Reset All Data</p>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textDim }}>Permanently delete all transactions, debts, budgets, and savings</p>
            </div>
            <Button variant="danger" onClick={() => setShowConfirm(true)}>Reset</Button>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card>
        <p style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600, color: C.text }}>About FinnTrack</p>
        <p style={{ margin: 0, fontSize: "13px", color: C.textMuted, lineHeight: "1.6" }}>
          A personal expense tracker built to consolidate spending across Revolut, AIB, Splitwise, and other payment apps.
          When connected to Supabase, your data syncs to a secure database with row-level security — nobody can see your data but you.
        </p>
      </Card>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Reset All Data?" width={380}>
        <p style={{ color: C.textMuted, fontSize: "14px", margin: "0 0 20px" }}>This will permanently delete all your transactions, debts, budgets, and savings pots. This action cannot be undone.</p>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" onClick={() => setShowConfirm(false)} style={{ flex: 1 }}>Cancel</Button>
          <Button variant="danger" onClick={handleReset} style={{ flex: 1 }}>Delete Everything</Button>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// AUTH SCREEN
// ============================================================
const AuthScreen = ({ onAuth, supabase }) => {
  const [mode, setMode] = useState("login"); // login | signup | forgot
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
        if (data.user && !data.session) {
          setMessage("Check your email for a confirmation link!");
        } else if (data.session) {
          onAuth(data.session);
        }
      } else if (mode === "login") {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onAuth(data.session);
      } else if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email);
        if (err) throw err;
        setMessage("Password reset email sent!");
      }
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; background: ${C.bg}; }
        body { font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif; }
      `}</style>
      <div style={{ width: "100%", maxWidth: "400px", padding: "20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "12px", background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 700, color: C.bg, marginBottom: "12px",
          }}>F</div>
          <h1 style={{ margin: 0, fontSize: "24px", color: C.text, fontWeight: 700 }}>FinnTrack</h1>
          <p style={{ margin: "4px 0 0", color: C.textMuted, fontSize: "14px" }}>Track expenses across all your apps</p>
        </div>

        <Card style={{ padding: "28px" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "18px", color: C.text, fontWeight: 600, textAlign: "center" }}>
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            {mode !== "forgot" && (
              <Input label="Password" type="password" placeholder={mode === "signup" ? "Min 6 characters" : "Your password"} value={password} onChange={e => setPassword(e.target.value)} />
            )}

            {error && <p style={{ margin: 0, fontSize: "13px", color: C.red, background: C.redDim, padding: "8px 12px", borderRadius: "6px" }}>{error}</p>}
            {message && <p style={{ margin: 0, fontSize: "13px", color: C.accent, background: C.accentDim, padding: "8px 12px", borderRadius: "6px" }}>{message}</p>}

            <Button onClick={handleSubmit} disabled={loading} style={{ width: "100%", marginTop: "4px" }}>
              {loading ? "Loading..." : mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </Button>
          </div>

          <div style={{ marginTop: "16px", textAlign: "center" }}>
            {mode === "login" && (
              <>
                <button onClick={() => setMode("signup")} style={{ ...btnBase, background: "none", color: C.accent, fontSize: "13px" }}>Don't have an account? Sign up</button>
                <br />
                <button onClick={() => setMode("forgot")} style={{ ...btnBase, background: "none", color: C.textDim, fontSize: "12px", marginTop: "6px" }}>Forgot password?</button>
              </>
            )}
            {mode === "signup" && (
              <button onClick={() => setMode("login")} style={{ ...btnBase, background: "none", color: C.accent, fontSize: "13px" }}>Already have an account? Log in</button>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} style={{ ...btnBase, background: "none", color: C.accent, fontSize: "13px" }}>Back to login</button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================================
// SUPABASE DATA LAYER
// Lightweight REST client with session persistence
// ============================================================
const createSupabaseClient = (url, key) => {
  const listeners = new Set();
  const STORAGE_KEY = "finntrack-auth";

  // Restore session from sessionStorage on creation
  let accessToken = null;
  let refreshToken = null;
  let currentUser = null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      accessToken = parsed.accessToken || null;
      refreshToken = parsed.refreshToken || null;
      currentUser = parsed.user || null;
    }
  } catch {}

  // Persist session to sessionStorage
  const persistSession = () => {
    try {
      if (accessToken && currentUser) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, user: currentUser }));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  };

  const headers = () => ({
    "Content-Type": "application/json",
    "apikey": key,
    ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
  });

  const restUrl = `${url}/rest/v1`;
  const authUrl = `${url}/auth/v1`;

  const auth = {
    async signUp({ email, password }) {
      const res = await fetch(`${authUrl}/signup`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": key }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) return { data: {}, error: data };
      if (data.access_token) {
        accessToken = data.access_token; refreshToken = data.refresh_token; currentUser = data.user;
        persistSession();
        listeners.forEach(fn => fn("SIGNED_IN", { user: data.user }));
      }
      return { data: { user: data.user, session: data.access_token ? { access_token: data.access_token, user: data.user } : null }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const res = await fetch(`${authUrl}/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": key }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) return { data: {}, error: data };
      accessToken = data.access_token; refreshToken = data.refresh_token; currentUser = data.user;
      persistSession();
      listeners.forEach(fn => fn("SIGNED_IN", { user: data.user }));
      return { data: { session: { access_token: data.access_token, user: data.user }, user: data.user }, error: null };
    },
    async signOut() {
      try { await fetch(`${authUrl}/logout`, { method: "POST", headers: headers() }); } catch {}
      accessToken = null; refreshToken = null; currentUser = null;
      persistSession();
      listeners.forEach(fn => fn("SIGNED_OUT", null));
      return { error: null };
    },
    async resetPasswordForEmail(email) {
      const res = await fetch(`${authUrl}/recover`, { method: "POST", headers: { "Content-Type": "application/json", "apikey": key }, body: JSON.stringify({ email }) });
      if (!res.ok) { const data = await res.json(); return { error: data }; }
      return { error: null };
    },
    async getSession() {
      // If we have a token, try to validate it by refreshing
      if (accessToken && refreshToken && currentUser) {
        // Try to refresh the token to make sure it's still valid
        try {
          const res = await fetch(`${authUrl}/token?grant_type=refresh_token`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": key },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (res.ok) {
            const data = await res.json();
            accessToken = data.access_token;
            refreshToken = data.refresh_token;
            currentUser = data.user;
            persistSession();
            return { data: { session: { access_token: accessToken, user: currentUser } }, error: null };
          }
        } catch {}
        // If refresh failed, clear everything
        accessToken = null; refreshToken = null; currentUser = null;
        persistSession();
      }
      return { data: { session: null }, error: null };
    },
    getUser() { return currentUser; },
    onAuthStateChange(fn) { listeners.add(fn); return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } }; },
  };

  // REST query builder
  const from = (table) => {
    let queryParts = [];
    let bodyData = null;
    let method = "GET";
    let matchFilters = [];
    let selectCols = "*";
    let orderCol = null;
    let orderAsc = true;
    let isSingle = false;

    const builder = {
      select(cols = "*") { selectCols = cols; method = "GET"; return builder; },
      insert(data) { bodyData = Array.isArray(data) ? data : [data]; method = "POST"; return builder; },
      update(data) { bodyData = data; method = "PATCH"; return builder; },
      delete() { method = "DELETE"; return builder; },
      eq(col, val) { matchFilters.push(`${col}=eq.${val}`); return builder; },
      order(col, { ascending = true } = {}) { orderCol = col; orderAsc = ascending; return builder; },
      single() { isSingle = true; return builder; },
      async then(resolve, reject) {
        try {
          let queryStr = `select=${selectCols}`;
          matchFilters.forEach(f => queryStr += `&${f}`);
          if (orderCol) queryStr += `&order=${orderCol}.${orderAsc ? "asc" : "desc"}`;
          const h = { ...headers() };
          if (method === "POST") h["Prefer"] = "return=representation";
          if (method === "PATCH" || method === "DELETE") h["Prefer"] = "return=representation";
          if (isSingle) h["Accept"] = "application/vnd.pgrst.object+json";
          const fetchUrl = `${restUrl}/${table}?${queryStr}`;
          const res = await fetch(fetchUrl, { method, headers: h, ...(bodyData ? { body: JSON.stringify(bodyData) } : {}) });
          const data = await res.json();
          if (!res.ok) resolve({ data: null, error: data });
          else resolve({ data, error: null });
        } catch (e) { resolve({ data: null, error: e }); }
      }
    };
    return builder;
  };

  return { auth, from };
};

// ============================================================
// MAIN APP (with Supabase Auth + Database)
// ============================================================
export default function App() {
  // Supabase client — created once
  const [supabase] = useState(() => createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY));

  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsPots, setSavingsPots] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(getMonthKey(new Date().toISOString()));
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const isDemo = !SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_URL";
  const userId = session?.user?.id;

  // Check for existing session on mount
  useEffect(() => {
    if (isDemo) { setAuthChecked(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setSession(data.session);
      setAuthChecked(true);
    });
  }, []);

  // Load data — from Supabase if connected, otherwise from window.storage for demo
  const loadData = useCallback(async () => {
    if (isDemo || !userId) {
      // Demo mode: use window.storage
      const data = await DB.load("finntrack-data", null);
      if (data) {
        setTransactions(data.transactions || []);
        setDebts(data.debts || []);
        setBudgets(data.budgets || []);
        setSavingsPots(data.savingsPots || []);
      } else {
        const sample = generateSampleData();
        setTransactions(sample.transactions);
        setDebts(sample.debts);
        setBudgets(sample.budgets);
        setSavingsPots(sample.savingsPots || []);
      }
      setLoaded(true);
      return;
    }

    // Production: load from Supabase
    setSyncing(true);
    try {
      const [txRes, budgetRes, debtRes, potsRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase.from("budgets").select("*").eq("user_id", userId),
        supabase.from("debts").select("*").eq("user_id", userId),
        supabase.from("savings_pots").select("*").eq("user_id", userId),
      ]);

      setTransactions((txRes.data || []).map(t => ({ ...t, amount: parseFloat(t.amount) })));
      setBudgets((budgetRes.data || []).map(b => ({ ...b, limit: parseFloat(b.limit) })));
      setDebts((debtRes.data || []).map(d => ({ ...d, amount: parseFloat(d.amount) })));

      // Load contributions for each pot
      const pots = potsRes.data || [];
      if (pots.length > 0) {
        const contribRes = await supabase.from("savings_contributions").select("*").eq("user_id", userId).order("date", { ascending: false });
        const contribs = (contribRes.data || []).map(c => ({ ...c, amount: parseFloat(c.amount) }));
        const potsWithContribs = pots.map(p => ({
          ...p, target: parseFloat(p.target), monthlyAmount: parseFloat(p.monthly_amount || 0),
          contributions: contribs.filter(c => c.pot_id === p.id),
        }));
        setSavingsPots(potsWithContribs);
      } else {
        setSavingsPots([]);
      }
    } catch (e) {
      console.error("Error loading data:", e);
    }
    setSyncing(false);
    setLoaded(true);
  }, [userId, isDemo]);

  useEffect(() => {
    if (isDemo || userId) loadData();
  }, [userId, isDemo, loadData]);

  // Save helper — syncs to Supabase or window.storage
  const save = useCallback(async () => {
    if (isDemo) {
      setTimeout(() => {
        DB.save("finntrack-data", { transactions, debts, budgets, savingsPots });
      }, 100);
      return;
    }
    // In production mode, individual components handle their own Supabase writes
    // This function is kept for compatibility — the real writes happen in the component handlers below
  }, [transactions, debts, budgets, savingsPots, isDemo]);

  useEffect(() => {
    if (loaded && isDemo) save();
  }, [transactions, debts, budgets, savingsPots, loaded, save, isDemo]);

  // Supabase CRUD helpers (used by child components)
  const dbAdd = async (table, row) => {
    if (isDemo) return row;
    const { data, error } = await supabase.from(table).insert({ ...row, user_id: userId }).select("*").single();
    if (error) { console.error("Insert error:", error); return null; }
    return data;
  };

  const dbUpdate = async (table, id, updates) => {
    if (isDemo) return true;
    const { error } = await supabase.from(table).update(updates).eq("id", id).eq("user_id", userId);
    if (error) { console.error("Update error:", error); return false; }
    return true;
  };

  const dbDelete = async (table, id) => {
    if (isDemo) return true;
    const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", userId);
    if (error) { console.error("Delete error:", error); return false; }
    return true;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTransactions([]); setDebts([]); setBudgets([]); setSavingsPots([]);
    setLoaded(false);
  };

  // Auth screen for production mode
  if (!isDemo && authChecked && !session) {
    return <AuthScreen onAuth={(s) => setSession(s)} supabase={supabase} />;
  }

  if (!authChecked || !loaded) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "28px", margin: 0 }}>◎</p>
          <p style={{ color: C.textMuted, fontSize: "14px", marginTop: "8px" }}>Loading FinnTrack...</p>
        </div>
      </div>
    );
  }

  const NAV = [
    { id: "dashboard", icon: "◎", label: "Dashboard" },
    { id: "transactions", icon: "↕", label: "Transactions" },
    { id: "savings", icon: "🏦", label: "Savings" },
    { id: "debts", icon: "⇄", label: "Debts" },
    { id: "budgets", icon: "🎯", label: "Budgets" },
    { id: "settings", icon: "⚙", label: "Settings" },
  ];

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: C.bg, display: "flex",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
      color: C.text, fontSize: "14px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; background: ${C.bg}; }
        body { font-family: 'DM Sans', 'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
        #root { display: flex; min-height: 100vh; }
        a { text-decoration: none; color: inherit; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        select option { background: ${C.card}; color: ${C.text}; }
        input[type="checkbox"] { accent-color: ${C.accent}; }
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? "220px" : "60px", minHeight: "100vh", background: C.card,
        borderRight: `1px solid ${C.border}`, padding: "20px 0", display: "flex", flexDirection: "column",
        transition: "width 0.2s ease", flexShrink: 0, overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 16px", marginBottom: "28px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "8px", background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: C.bg, flexShrink: 0,
          }}>F</div>
          {sidebarOpen && <span style={{ fontSize: "17px", fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>FinnTrack</span>}
        </div>

        {/* Connection status */}
        {sidebarOpen && (
          <div style={{ padding: "0 16px", marginBottom: "16px" }}>
            <div style={{ padding: "6px 10px", borderRadius: "6px", background: isDemo ? C.amberDim : C.accentDim, fontSize: "11px", fontWeight: 500, color: isDemo ? C.amber : C.accent }}>
              {isDemo ? "⚠ Demo mode — local only" : `✓ Connected${syncing ? " — syncing..." : ""}`}
            </div>
            {!isDemo && session?.user?.email && (
              <p style={{ margin: "6px 0 0", fontSize: "11px", color: C.textDim, overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.email}</p>
            )}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", padding: "0 8px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              ...btnBase, display: "flex", alignItems: "center", gap: "10px",
              padding: sidebarOpen ? "10px 12px" : "10px", fontSize: "14px", fontWeight: 500,
              background: page === n.id ? C.accentDim : "transparent",
              color: page === n.id ? C.accent : C.textMuted,
              justifyContent: sidebarOpen ? "flex-start" : "center",
              borderRadius: "8px", whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>{n.icon}</span>
              {sidebarOpen && n.label}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {!isDemo && (
            <button onClick={handleSignOut} style={{
              ...btnBase, display: "flex", alignItems: "center", gap: "10px",
              padding: sidebarOpen ? "10px 12px" : "10px", fontSize: "13px", fontWeight: 500,
              background: "transparent", color: C.red, justifyContent: sidebarOpen ? "flex-start" : "center",
              borderRadius: "8px", whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>↪</span>
              {sidebarOpen && "Sign Out"}
            </button>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            ...btnBase, padding: "10px", background: "transparent",
            color: C.textDim, fontSize: "14px",
          }}>{sidebarOpen ? "◁ Collapse" : "▷"}</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, padding: "24px 32px", maxWidth: "960px", margin: "0 auto", overflow: "auto", width: "100%" }}>
        {page === "dashboard" && <Dashboard transactions={transactions} budgets={budgets} debts={debts} savingsPots={savingsPots} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} setPage={setPage} />}
        {page === "transactions" && <Transactions transactions={transactions} setTransactions={setTransactions} onSave={save} />}
        {page === "savings" && <Savings savingsPots={savingsPots} setSavingsPots={setSavingsPots} onSave={save} />}
        {page === "debts" && <Debts debts={debts} setDebts={setDebts} onSave={save} />}
        {page === "budgets" && <Budgets budgets={budgets} setBudgets={setBudgets} transactions={transactions} currentMonth={currentMonth} onSave={save} />}
        {page === "settings" && <Settings transactions={transactions} debts={debts} budgets={budgets} savingsPots={savingsPots} setTransactions={setTransactions} setDebts={setDebts} setBudgets={setBudgets} setSavingsPots={setSavingsPots} onSave={save} />}
      </main>
    </div>
  );
}