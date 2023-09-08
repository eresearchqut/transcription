import { CloudFrontRequestHandler } from "aws-lambda";

const hasExtension = /^\/.*\..+$/;

export const handler: CloudFrontRequestHandler = async (event) => {
  const { request } = event.Records[0].cf;
  if (!request.uri.match(hasExtension)) {
    request.uri = `${request.uri}.html`;
  }
  return request
};