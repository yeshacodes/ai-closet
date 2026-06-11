import type { ActiveUserScope } from "@/lib/sessionMode";
import { supabase } from "@/lib/supabase";

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

    return query.eq("is_demo", true);
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
    return scope.mode === "user" && scope.userId
        ? { user_id: scope.userId, is_demo: false }
        : { user_id: null, is_demo: true };
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
    return scope.isDemo ? "Demo Closet" : "Your Closet";
}
