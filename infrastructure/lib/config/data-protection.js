"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDataProtected = isDataProtected;
/**
 * Whether this deployment holds real user data and must be protected
 * (deletion protection on, RETAIN removal policy, AWS Backup plan).
 *
 * Defaults to TRUE: protection is opt-OUT, not opt-in. Keying protection on
 * `environment === 'prod'` was the bug - the only deployed environment is dev,
 * and dev holds the real users and the real table.
 *
 * Opt out for a throwaway stack with: --context dataProtection=false
 */
function isDataProtected(scope) {
    // CLI context arrives as the string 'false'; cdk.json context could be the boolean.
    const value = scope.node.tryGetContext('dataProtection');
    return value !== 'false' && value !== false;
}
