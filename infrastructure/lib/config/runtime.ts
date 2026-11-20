import * as lambda from 'aws-cdk-lib/aws-lambda';

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
export const LAMBDA_RUNTIME = new lambda.Runtime('nodejs24.x', lambda.RuntimeFamily.NODEJS, {
  supportsInlineCode: true,
});
