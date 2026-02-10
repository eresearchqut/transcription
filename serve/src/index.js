const hasExtension = /^\/.*\..+$/;

/** @type {import ("aws-lambda").CloudFrontRequestHandler} */
const handler = async (event) => {
  const { request } = event.Records[0].cf;
  console.log(request.uri);
  if (request.uri === '/') {
    request.uri = '/index.html';
  } else if (!request.uri.match(hasExtension)) {
    request.uri = `${request.uri}.html`;
  }
  return request;
};

exports.handler = handler;