import type { ActiveUserScope } from "./sessionMode";

export function getScopeKey(scope: ActiveUserScope) {
    return `${scope.mode}:${scope.userId || "none"}`;
}

export function canReadDataScope(scope: ActiveUserScope) {
    return scope.mode === "demo" || (scope.mode === "user" && Boolean(scope.userId));
}

export function canWritePersonalData(scope: ActiveUserScope) {
    return scope.mode === "user" && Boolean(scope.userId);
}

export function assertCanReadData(scope: ActiveUserScope) {
    if (!canReadDataScope(scope)) {
        throw new Error("A valid demo or signed-in user scope is required to read wardrobe data.");
    }
}

export function assertCanWritePersonalData(scope: ActiveUserScope) {
    if (!canWritePersonalData(scope)) {
        throw new Error("Sign in before saving changes to your personal closet.");
    }
}
