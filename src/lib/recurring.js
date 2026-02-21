import { collection, addDoc, writeBatch, doc } from "firebase/firestore";
import { dateStr } from "./utils";

/**
 * processRecurringTransactions:
 * Checks all user transactions marked `recurring: true`.
 * If a recurring transaction from a previous month has not been cloned 
 * into the current month, it automatically creates a new instance for the current month.
 */
export async function processRecurringTransactions(transactions, userId, db) {
    if (!transactions || transactions.length === 0) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Find all distinct recurring transactions base templates
    const recurringTemplates = transactions.filter(t => t.recurring);

    // We identify a "series" by matching note and category
    // In a full prod app, we'd use a `series_id`. Here we group by note+category
    const grouped = {};
    for (const t of recurringTemplates) {
        const key = `${t.category}_${t.note}_${t.amount}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
    }

    const batch = writeBatch(db);
    let addedCount = 0;

    for (const key in grouped) {
        const series = grouped[key];
        // Sort by date descending to find the latest execution
        series.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestTx = series[0];

        const latestDate = new Date(latestTx.date);

        // If the latest transaction was NOT in the current month, 
        // it means it hasn't fired yet for this month.
        if (
            latestDate.getFullYear() < currentYear ||
            (latestDate.getFullYear() === currentYear && latestDate.getMonth() < currentMonth)
        ) {
            // It's a new month! We need to auto-inject the recurring charge.

            // Calculate the exact date for THIS month (e.g. if it was the 15th, charge on the 15th of this month)
            // Note: If last month had 31 days and this month has 30, JS Date handles overflow by rolling to next month.
            // We clip it to the last day of the current month contextually.
            let nextDate = new Date(currentYear, currentMonth, latestDate.getDate());
            if (nextDate.getMonth() !== currentMonth) {
                // Rolled over because current month doesn't have that many days (e.g. Feb 30 -> Mar 2)
                // Snap back to last day of target month
                nextDate = new Date(currentYear, currentMonth + 1, 0);
            }

            // Don't auto-add if the target date is in the future relative to exactly right now.
            if (nextDate > now) continue;

            const newTx = {
                amount: latestTx.amount,
                type: latestTx.type,
                category: latestTx.category,
                date: nextDate.toISOString().slice(0, 10),
                app: latestTx.app,
                note: latestTx.note,
                recurring: true,
                user_id: userId
            };

            const docRef = doc(collection(db, "transactions"));
            batch.set(docRef, newTx);
            addedCount++;
        }
    }

    if (addedCount > 0) {
        try {
            await batch.commit();
            console.log(`Auto-added ${addedCount} recurring transactions.`);
        } catch (err) {
            console.error("Failed to process recurring ones:", err);
        }
    }
}
