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
exports.LAMBDA_RUNTIME = void 0;
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
/**
 * The one Node.js runtime every BudgetBuddy Lambda function and layer uses: the
 * `runtime` of each function, each layer's `compatibleRuntimes`, and the Docker image
 * for the asset bundling steps (`LAMBDA_RUNTIME.bundlingImage`).
 *
 * nodejs24.x is supported until Apr 30, 2028. nodejs20.x was deprecated on Apr 30, 2026
 * (https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html).
 *
 * Why not `lambda.Runtime.NODEJS_24_X`: the installed aws-cdk-lib (2.221.0) predates
 * that constant, which shipped in 2.225.0. The props here match the ones CDK gives
 * NODEJS_22_X. The next time aws-cdk-lib is upgraded to >= 2.225.0, replace this with
 * `lambda.Runtime.NODEJS_24_X`.
 */
exports.LAMBDA_RUNTIME = new lambda.Runtime('nodejs24.x', lambda.RuntimeFamily.NODEJS, {
    supportsInlineCode: true,
});
