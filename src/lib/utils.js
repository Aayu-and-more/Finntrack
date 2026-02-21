export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const PAYMENT_APPS = ["Revolut", "BofA", "CashApp", "Cash", "Other"];

export const getMonthKey = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
};

export const dateStr = (d) => {
    const x = new Date(d);
    return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
};
