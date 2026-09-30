import assert from "node:assert/strict";
import test from "node:test";
import {
    assertCanWritePersonalData,
    canReadDataScope,
    canWritePersonalData,
    getScopeKey
} from "../src/lib/dataScopeCore.ts";
import { resolveStartupMode } from "../src/lib/sessionModeCore.ts";
import { canSaveScopedResource, isCurrentOperation } from "../src/lib/operationGuard.ts";

const baseScope = {
    user: null,
    session: null,
    isLoading: false,
    isHydrated: true,
    isAuthenticated: false,
    hasChosenDemo: false,
    useDemoMode: () => undefined,
    useUserMode: () => undefined,
    signOut: async () => undefined
};

test("visitor scope cannot read demo or personal wardrobe data", () => {
    const visitorScope = {
        ...baseScope,
        mode: "visitor",
        userId: null,
        isDemo: false,
        canReadData: false,
        canWritePersonalData: false
    };

    assert.equal(canReadDataScope(visitorScope), false);
    assert.equal(canWritePersonalData(visitorScope), false);
    assert.equal(getScopeKey(visitorScope), "visitor:none");
});

test("user mode without a user id is blocked instead of falling back to demo", () => {
    const unresolvedUserScope = {
        ...baseScope,
        mode: "user",
        userId: null,
        isDemo: false,
        isAuthenticated: true,
        canReadData: false,
        canWritePersonalData: false
    };

    assert.equal(canReadDataScope(unresolvedUserScope), false);
    assert.throws(() => assertCanWritePersonalData(unresolvedUserScope), /Sign in/);
});

test("demo reads are explicit and personal writes require a valid user", () => {
    const demoScope = {
        ...baseScope,
        mode: "demo",
        userId: null,
        isDemo: true,
        hasChosenDemo: true,
        canReadData: true,
        canWritePersonalData: false
    };
    const userScope = {
        ...baseScope,
        mode: "user",
        userId: "user-123",
        isDemo: false,
        isAuthenticated: true,
        canReadData: true,
        canWritePersonalData: true
    };

    assert.equal(canReadDataScope(demoScope), true);
    assert.equal(canWritePersonalData(demoScope), false);
    assert.equal(canReadDataScope(userScope), true);
    assert.equal(canWritePersonalData(userScope), true);
});

test("persisted demo mode resolves to user mode when a real session exists at startup", () => {
    assert.equal(resolveStartupMode("demo", true), "user");
    assert.equal(resolveStartupMode("user", false), "visitor");
    assert.equal(resolveStartupMode("demo", false), "demo");
});

test("scope changes cancel delayed generation completions", () => {
    const token = { scopeKey: "user:alice", operationId: 1 };

    assert.equal(isCurrentOperation(token, "user:alice", 1), true);
    assert.equal(isCurrentOperation(token, "user:bob", 1), false);
});

test("stale generated outfits cannot be saved under a new scope", () => {
    assert.equal(canSaveScopedResource("user:alice", "user:alice"), true);
    assert.equal(canSaveScopedResource("user:alice", "user:bob"), false);
    assert.equal(canSaveScopedResource(null, "user:bob"), false);
});

test("older edit delete and upload completions cannot update newer operations", () => {
    const oldEdit = { scopeKey: "user:alice", operationId: 1 };
    const newerEditId = 2;

    assert.equal(isCurrentOperation(oldEdit, "user:alice", newerEditId), false);
    assert.equal(isCurrentOperation(oldEdit, "user:bob", oldEdit.operationId), false);
});

test("stale finally handlers and navigation are rejected by operation token", () => {
    const upload = { scopeKey: "user:alice", operationId: 7 };

    assert.equal(isCurrentOperation(upload, "user:alice", 7), true);
    assert.equal(isCurrentOperation(upload, "user:alice", 8), false);
    assert.equal(isCurrentOperation(upload, "visitor:none", 7), false);
});
