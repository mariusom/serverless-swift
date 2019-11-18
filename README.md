# serverless swift [![npm](https://img.shields.io/npm/v/serverless-swift.svg)](https://www.npmjs.com/package/serverless-swift)

> A ⚡ [Serverless framework](https://serverless.com/framework/) ⚡ plugin for [Swift](https://developer.apple.com/swift/) applications

## 📦 Install

Install the plugin with npm

```sh
$ npm i -D serverless-swift
```

💡 This serverless plugin assumes you are building Swift lambdas targeting the AWS Lambda "provided" runtime. The [AWS Lambda Swfit Sprinter](https://github.com/swift-sprinter/aws-lambda-swift-sprinter-core) makes this possible.

Add the following to your serverless project's `serverless.yml` file

```yaml
service: demo
provider:
  name: aws
  runtime: swift
plugins:
  # this adds informs serverless to use
  # the serverless-swift plugin
  - serverless-swift
# creates one artifact for each function
package:
  individually: true
functions:
  test:
    # handler value syntax is `{your-executable-binary}.{bin-name}`
    # or `{your-executable-binary}` for short when you are building a
    # default bin for a given package.
    handler: your-executable-binary
```

# Acknowledgements

This project has been possible thanks to the following people:

- Doug Tangren : https://github.com/softprops/serverless-rust
- Andrea Scuderi : https://github.com/swift-sprinter/aws-lambda-swift-sprinter-core
