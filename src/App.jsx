import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./lib/firebase";

// Global Hooks & Logic
import { useFirebaseSync } from "./hooks/useFirebaseSync";
import { processRecurringTransactions } from "./lib/recurring";

// UI Providers & Layout
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { Layout } from "./components/layout/Layout";

// Pages
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Budgets } from "./pages/Budgets";
import { Debts } from "./pages/Debts";
import { Savings } from "./pages/Savings";
import { Settings } from "./pages/Settings";

export default function App() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("dashboard");

  // 1. Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSession(user);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Automatically sync all user data in real-time
  const userId = session?.uid;
  const { transactions, debts, budgets, savingsPots, loading } = useFirebaseSync(userId);

  // 3. Process recurring transactions once initial data is loaded
  useEffect(() => {
    if (!loading && transactions.length > 0 && userId) {
      processRecurringTransactions(transactions, userId, db);
    }
  }, [loading, transactions, userId]);

  // Loading State
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-textMuted font-medium animate-pulse">Loading FinnTrack...</p>
      </div>
    );
  }

  // Unauthenticated State
  if (!session) {
    return (
      <ThemeProvider>
        <Auth />
      </ThemeProvider>
    );
  }

  // Data Loading State (Wait for Firestore to return initial snapshot)
  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-bg flex items-center justify-center flex-col gap-4 fade-in">
          <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin"></div>
          <p className="text-textMuted font-medium">Syncing your data...</p>
        </div>
      </ThemeProvider>
    );
  }

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setSession(null);
      setPage("dashboard");
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  // Authenticated Application State
  return (
    <ThemeProvider>
      <Layout page={page} setPage={setPage} onSignOut={handleSignOut}>

        {page === "dashboard" && (
          <Dashboard
            transactions={transactions}
            budgets={budgets}
            debts={debts}
            savingsPots={savingsPots}
            setPage={setPage}
          />
        )}

        {page === "transactions" && (
          <Transactions
            transactions={transactions}
            userId={userId}
          />
        )}

        {page === "budgets" && (
          <Budgets
            budgets={budgets}
            transactions={transactions}
            currentMonth={new Date().toISOString().slice(0, 7)} // "YYYY-MM"
            userId={userId}
          />
        )}

        {page === "savings" && (
          <Savings
            savingsPots={savingsPots}
            userId={userId}
          />
        )}

        {page === "debts" && (
          <Debts
            debts={debts}
            userId={userId}
          />
        )}

        {page === "settings" && (
          <Settings
            transactions={transactions}
            debts={debts}
            budgets={budgets}
            savingsPots={savingsPots}
            userId={userId}
          />
        )}

      </Layout>
    </ThemeProvider>
  );
}