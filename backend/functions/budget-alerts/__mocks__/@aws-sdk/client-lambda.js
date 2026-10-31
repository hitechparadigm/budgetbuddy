// Mock for @aws-sdk/client-lambda (provided by the Node 20 Lambda runtime, not installed locally)
const send = jest.fn();

class LambdaClient {
  constructor(config) {
    this.config = config;
  }

  send(command) {
    return send(command);
  }
}

class InvokeCommand {
  constructor(input) {
    this.input = input;
  }
}

module.exports = { LambdaClient, InvokeCommand, __send: send };
