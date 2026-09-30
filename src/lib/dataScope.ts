import type { ActiveUserScope } from "@/lib/sessionMode";
import { supabase } from "@/lib/supabase";
import {
    assertCanReadData,
    assertCanWritePersonalData,
    canReadDataScope,
    canWritePersonalData,
    getScopeKey
} from "@/lib/dataScopeCore";

export {
    assertCanReadData,
    assertCanWritePersonalData,
    canReadDataScope,
    canWritePersonalData,
    getScopeKey
};

type QueryBuilder = {
    eq: (column: string, value: string | boolean) => ScopedQuery;
}

type ScopedQuery = PromiseLike<{ data: unknown; error: unknown }> & {
    eq: (column: string, value: string | boolean) => ScopedQuery;
    or: (filters: string) => ScopedQuery;
    order: (column: string, options?: { ascending?: boolean }) => ScopedQuery;
    limit: (count: number) => ScopedQuery;
    select: (columns?: string) => ScopedQuery;
    single: () => PromiseLike<{ data: unknown; error: unknown }>;
}

type ScopedTable = {
    select: (columns?: string) => ScopedQuery;
    delete: () => ScopedQuery;
    update: (data: Record<string, unknown>) => ScopedQuery;
}

// Supabase's fluent query types can become excessively deep in app pages.
// Keep this boundary intentionally loose while preserving one scoped-query path.
export function buildScopedQuery(query: QueryBuilder, scope: ActiveUserScope): ScopedQuery {
    if (scope.mode === "user" && scope.userId) {
        return query.eq("user_id", scope.userId);
    }

    if (scope.mode === "demo") {
        return query.eq("is_demo", true);
    }

    throw new Error("A valid demo or signed-in user scope is required to query wardrobe data.");
}

export function scopedSelect(table: string, scope: ActiveUserScope) {
    return buildScopedQuery((supabase.from(table) as unknown as ScopedTable).select("*"), scope);
}

export function scopedDelete(table: string, scope: ActiveUserScope) {
    return buildScopedQuery((supabase.from(table) as unknown as ScopedTable).delete(), scope);
}

export function scopedUpdate(table: string, data: Record<string, unknown>, scope: ActiveUserScope) {
    return buildScopedQuery((supabase.from(table) as unknown as ScopedTable).update(data), scope);
}

export function getScopedUserFilter(scope: ActiveUserScope) {
    assertCanWritePersonalData(scope);
    return { user_id: scope.userId, is_demo: false };
}

export function getScopedInsertData<T extends Record<string, unknown>>(data: T, scope: ActiveUserScope): T & { user_id: string | null; is_demo: boolean } {
    const filter = getScopedUserFilter(scope);
    return {
        ...data,
        user_id: filter.user_id,
        is_demo: filter.is_demo
    };
}

export function getScopeLabel(scope: ActiveUserScope) {
    if (scope.isDemo) return "Demo Closet";
    if (scope.canWritePersonalData) return "Your Closet";
    return "Sign in required";
}
