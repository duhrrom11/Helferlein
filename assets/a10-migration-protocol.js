/* A10 isolated crash-safe migration protocol model.
 * Pure immutable state transitions; NO storage adapter, production wiring or I/O.
 * Durable CAS, atomic writes and independent backup MUST be implemented and proven separately.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10MigrationProtocol = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const copy = value => structuredClone(value);
    const fail = () => { throw new Error('A10 migration conflict or invalid state'); };
    function record(value) { return value && typeof value === 'object' && !Array.isArray(value); }
    function check(state) {
        if (!record(state) || Object.keys(state).sort().join(',') !==
            'active,legacy,revision,staging' || !Number.isSafeInteger(state.revision) ||
            state.revision < 0 || !record(state.legacy) ||
            typeof state.legacy.vaultId !== 'string' ||
            !['v1', 'v2'].includes(state.active) ||
            (state.staging !== null && !record(state.staging))) fail();
        if (state.active === 'v2' && !state.staging) fail();
        if (state.staging && (state.staging.formatVersion !== 2 ||
            state.staging.vaultId !== state.legacy.vaultId)) fail();
        return state;
    }
    function initial(legacy) {
        if (!record(legacy) || typeof legacy.vaultId !== 'string' || !legacy.vaultId ||
            typeof legacy.masterKeyHex !== 'string' || !/^[a-f0-9]{64}$/i.test(legacy.masterKeyHex)) fail();
        return check({ revision: 0, active: 'v1', legacy: copy(legacy), staging: null });
    }
    function transition(state, expectedRevision, mutate) {
        check(state);
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== state.revision ||
            expectedRevision === Number.MAX_SAFE_INTEGER) fail();
        const next = copy(state);
        mutate(next);
        next.revision++;
        check(next);
        // Do not allow any transition to mutate the original V1 fallback.
        if (JSON.stringify(next.legacy) !== JSON.stringify(state.legacy)) fail();
        return next;
    }
    function stage(state, expectedRevision, candidate) {
        return transition(state, expectedRevision, next => {
            if (next.active !== 'v1' || next.staging !== null ||
                !record(candidate) || candidate.formatVersion !== 2 ||
                candidate.vaultId !== next.legacy.vaultId ||
                Object.hasOwn(candidate, 'masterKeyHex') ||
                !record(candidate.encryptedData) || !record(candidate.encryptedConfig) ||
                !record(candidate.keyEnvelope)) fail();
            next.staging = copy(candidate);
        });
    }
    function activate(state, expectedRevision, verified) {
        return transition(state, expectedRevision, next => {
            // This flag is only a simulated test gate, NOT a security proof.
            // Production activation is forbidden without independent durable backup and CAS.
            if (next.active !== 'v1' || !next.staging || verified !== true) fail();
            next.active = 'v2';
        });
    }
    function recoverAfterCrash(state) {
        check(state);
        // Read-only: no implicit promotion or deletion.
        return Object.freeze({
            action: state.active === 'v1'
                ? (state.staging ? 'KEEP_V1_IGNORE_STAGING' : 'KEEP_V1')
                : 'KEEP_V2_NO_AUTOMATIC_ROLLBACK',
            revision: state.revision
        });
    }
    return Object.freeze({ initial, stage, activate, recoverAfterCrash });
});
