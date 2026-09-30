export type OperationToken = {
    scopeKey: string;
    operationId: number;
}

export function isCurrentOperation(
    token: OperationToken,
    currentScopeKey: string,
    currentOperationId: number
) {
    return token.scopeKey === currentScopeKey && token.operationId === currentOperationId;
}

export function canSaveScopedResource(resourceScopeKey: string | null, currentScopeKey: string) {
    return Boolean(resourceScopeKey) && resourceScopeKey === currentScopeKey;
}
