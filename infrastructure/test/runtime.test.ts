import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LAMBDA_RUNTIME } from '../lib/config/runtime';

// cdk synth cannot run without Docker, so this pins the hand-built runtime
// definition (see lib/config/runtime.ts) to what Lambda must receive.
describe('LAMBDA_RUNTIME', () => {
  it('is the nodejs24.x runtime', () => {
    expect(LAMBDA_RUNTIME.name).toBe('nodejs24.x');
    expect(LAMBDA_RUNTIME.toString()).toBe('nodejs24.x');
  });

  it('is in the Node.js runtime family', () => {
    expect(LAMBDA_RUNTIME.family).toBe(lambda.RuntimeFamily.NODEJS);
  });

  it('bundles with the matching SAM build image', () => {
    expect(LAMBDA_RUNTIME.bundlingImage.image).toBe('public.ecr.aws/sam/build-nodejs24.x');
  });
});
