"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bedrockModelResourceArns = exports.BEDROCK_MODEL_ID = exports.BEDROCK_INFERENCE_PROFILE_ID = void 0;
/**
 * The one Bedrock model every BudgetBuddy AI Lambda invokes, passed to each as the
 * BEDROCK_MODEL_ID env var. backend/layers/common/nodejs/utils.js carries the same
 * value as its fallback default; change both together.
 *
 * Claude Haiku 4.5 through the US cross-region inference profile. The bare
 * foundation-model ID has no on-demand throughput for this model, so the profile ID
 * is required. Chosen 2026-10-31 by a test InvokeModel from the project AWS account:
 * Haiku 4.5 answered; Haiku 5.5 returned AccessDeniedException (not enabled for the
 * account); the old claude-3-5-sonnet-20241022-v2:0 returned "end of its life".
 */
exports.BEDROCK_INFERENCE_PROFILE_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
exports.BEDROCK_MODEL_ID = exports.BEDROCK_INFERENCE_PROFILE_ID;
const FOUNDATION_MODEL_ID = 'anthropic.claude-haiku-4-5-20251001-v1:0';
/** Regions the `us.` profile routes to from a US source region (AWS model card). */
const PROFILE_DESTINATION_REGIONS = ['us-east-1', 'us-east-2', 'us-west-2'];
/**
 * IAM resources for bedrock:InvokeModel on BEDROCK_MODEL_ID. A cross-region
 * inference profile needs the profile ARN in the caller's region AND the
 * foundation-model ARN in every region the profile can route to.
 *
 * @param region - The stack's region (the caller's source region)
 * @param account - The stack's account (inference profile ARNs are account-scoped)
 */
const bedrockModelResourceArns = (region, account) => [
    `arn:aws:bedrock:${region}:${account}:inference-profile/${exports.BEDROCK_INFERENCE_PROFILE_ID}`,
    ...PROFILE_DESTINATION_REGIONS.map((r) => `arn:aws:bedrock:${r}::foundation-model/${FOUNDATION_MODEL_ID}`),
];
exports.bedrockModelResourceArns = bedrockModelResourceArns;
