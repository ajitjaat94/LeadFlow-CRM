export const parseDateOnly = (value) => {
    if (value === undefined || value === null || value === "") return { value: null };
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { error: "Expected close date must use YYYY-MM-DD format." };
    }
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
        return { error: "Expected close date is invalid." };
    }
    return { value: parsed };
};

export const serializeDeal = (item) => {
    const date = item.expectedCloseDate ? new Date(item.expectedCloseDate) : null;
    return {
        ...item,
        expectedCloseDate: date && !Number.isNaN(date.getTime())
            ? date.toISOString().slice(0, 10)
            : null,
    };
};
