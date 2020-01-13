# serverless swift [![npm](https://img.shields.io/npm/v/serverless-swift.svg)](https://www.npmjs.com/package/serverless-swift)

> A ⚡ [Serverless framework](https://serverless.com/framework/) ⚡ plugin for [Swift](https://developer.apple.com/swift/) applications

## 📦 Install

Install the plugin with npm

```sh
$ npm i -D serverless-swift
```

💡 This serverless plugin assumes you are building Swift lambdas targeting the AWS Lambda "provided" runtime.

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

functions:
  test:
    # handler value syntax is `{your-executable-binary}.{bin-name}`
    # or `{your-executable-binary}` for short when you are building a
    # default bin for a given package.
    handler: <your-executable-binary>
```

The build needs to generate a swift executable. The name of the executable will either be the Swift project parent folder name by default or specified in the Package.swift file. Remember to place that instead of <your-executable-binary> above.

On every deploy a prebuilt AWS Lambda Layer is attached automatically to every swift functions. The layer adds required dependencies to run a compiled Swift executables in a Lambda.

## 🙌 Acknowledgements

This project has been possible thanks to the following people:

- Doug Tangren : https://github.com/softprops/serverless-rust
- Andrea Scuderi : https://github.com/swift-sprinter/aws-lambda-swift-sprinter-core
- Fabian Fett: https://github.com/fabianfett/swift-lambda-runtime
