const hasExtension = /^\/.*\..+$/;

/** @type {import ("aws-lambda").CloudFrontRequestHandler} */
const handler = async (event, context, callback) => {
  const { request } = event.Records[0].cf;
  console.log(`Request uri: ${request.uri}`);
  if (request.uri === '/') {
    request.uri = '/index.html';
  } else if (!request.uri.match(hasExtension)) {
    request.uri = `${request.uri}.html`;
  }
  console.log(`Final uri: ${request.uri}`);
  callback(null, request);
};

exports.handler = handler;