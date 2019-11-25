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

The build needs to generate a swift executable. The name of the executable will either be the Swift project parent folder name or as specified in the Package.swift file, to replace with <your-executable-binary> above.

Currently on every deploy it creates an AWS Lambda Layer, that is attached automatically to every swift functions. The layer makes it possible for the executable Swift binary to run in the Lambda.

## Configuration

### Swift private packages on Github

When dealing with private swift packages held in github you can either forwards the ssh keys or the ssh agent so that the container will have access to clone the repos.

#### SSH Keys

We can forward the ssh folder from the host machine to the running container (when it has no passphrase).

We can do this by setting custom variables to activate it:

```yaml
custom:
  swift:
    ssh:
      keys: true
```

Or you can activate it via the command line:

```bash
sls <deploy/package> --ssh-keys
```

#### SSH Agent

We can forward the ssh agent from the host machine to the running container (useful when ssh key has passphrease). Currently this only works with Docker Machine for MacOS, version 2.1.6.0(408) from the edge channel.

We can do this by setting custom variables to activate it:

```yaml
custom:
  swift:
    ssh:
      agent: true
```

Or you can activate it via the command line:

```bash
sls <deploy/package> --ssh-agent
```

## 🙌 Acknowledgements

This project has been possible thanks to the following people:

- Doug Tangren : https://github.com/softprops/serverless-rust
- Andrea Scuderi : https://github.com/swift-sprinter/aws-lambda-swift-sprinter-core
