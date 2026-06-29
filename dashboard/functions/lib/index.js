"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAuthUserCreate = exports.syncAuthUsers = void 0;
const admin = __importStar(require("firebase-admin"));
const v1_1 = require("firebase-functions/v1");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const USERS_COLLECTION = 'users';
async function callerIsAdmin(uid) {
    const doc = await admin.firestore().collection(USERS_COLLECTION).doc(uid).get();
    if (!doc.exists)
        return false;
    const role = doc.data()?.role;
    return role === 'admin' || role == null;
}
async function upsertAuthUser(authUser) {
    const ref = admin.firestore().collection(USERS_COLLECTION).doc(authUser.uid);
    const existing = await ref.get();
    const existingData = existing.data() ?? {};
    const providers = authUser.providerData.map((provider) => provider.providerId);
    const authProvider = providers[0] ?? 'password';
    const patch = {
        email: authUser.email ?? existingData.email ?? '',
        name: authUser.displayName ||
            existingData.name ||
            authUser.email?.split('@')[0] ||
            authUser.uid.slice(0, 8),
        authProvider,
        authCreatedAt: authUser.metadata.creationTime ?? null,
        lastSignInAt: authUser.metadata.lastSignInTime ?? null,
        disabled: authUser.disabled ?? false,
    };
    if (!existing.exists) {
        await ref.set({
            ...patch,
            role: 'user',
            language: 'es',
            createdAt: new Date().toISOString(),
        });
        return;
    }
    await ref.set(patch, { merge: true });
}
async function listAllAuthUsers() {
    const users = [];
    let nextPageToken;
    do {
        const page = await admin.auth().listUsers(1000, nextPageToken);
        users.push(...page.users);
        nextPageToken = page.pageToken;
    } while (nextPageToken);
    return users;
}
/** Sync every Firebase Authentication user into Firestore /users (admin only). */
exports.syncAuthUsers = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required.');
    }
    if (!(await callerIsAdmin(request.auth.uid))) {
        throw new https_1.HttpsError('permission-denied', 'Admin access required.');
    }
    const authUsers = await listAllAuthUsers();
    await Promise.all(authUsers.map((user) => upsertAuthUser(user)));
    return { count: authUsers.length };
});
/** Keep Firestore in sync when a new Auth account is created. */
exports.onAuthUserCreate = v1_1.auth.user().onCreate(async (user) => {
    await upsertAuthUser(user);
});
//# sourceMappingURL=index.js.map