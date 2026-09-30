import type { AppMode } from "@/lib/sessionMode";

export function resolveStartupMode(storedMode: string | null, hasSession: boolean): AppMode {
    if (hasSession) return "user";
    return storedMode === "demo" ? "demo" : "visitor";
}

export function resolveEffectiveMode(mode: AppMode, hasUser: boolean): AppMode {
    if (mode === "demo") return "demo";
    if (hasUser) return "user";
    return "visitor";
}
