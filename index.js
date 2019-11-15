class SwiftPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.hooks = {
      "before:deploy:resources": this.check.bind(this)
    };
  }

  check() {
    this.serverless.cli.log("Triggered");
  }
}

module.exports = SwiftPlugin;
