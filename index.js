class SwiftPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.hooks = {
      "before:deploy:resources": this.check.bind(this)
    };
  }

  check() {
    console.log("Before Deploy Resources");
  }
}

module.exports = SwiftPlugin;
