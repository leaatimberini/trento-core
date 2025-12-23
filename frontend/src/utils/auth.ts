
import { User } from "../types";

export const getCurrentUser = (): User | null => {
    if (typeof window === "undefined") return null;
    try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return null;
        return JSON.parse(userStr);
    } catch {
        return null;
    }
};

export const isAdmin = (): boolean => {
    const user = getCurrentUser();
    return user?.role === 'ADMIN';
};
