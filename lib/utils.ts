import { AWS_ACCOUNT_ID, LAMBDA_LAYER_VERSION, DOCKER_USERNAME, DOCKER_REPO } from "./constants";

export const dockerImage = (dockerTag: string) =>
  `${DOCKER_USERNAME}/${DOCKER_REPO}:${dockerTag}`;

export const layerArn = (region: string) =>
  `arn:aws:lambda:${region}:${AWS_ACCOUNT_ID}:layer:swift:${LAMBDA_LAYER_VERSION}`;
