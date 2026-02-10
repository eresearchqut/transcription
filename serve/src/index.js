const extension = /(.+)\.[a-zA-Z0-9]{2,5}$/;
const slash = /\/$/;
const nextStatic = /\/_next\/static\//;

/** @type {import ("aws-lambda").CloudFrontRequestHandler} */
const handler = async (event) => {
  const { request } = event.Records[0].cf;
  let { uri } = request;
  if (uri) {
    if (!uri.match(nextStatic)) {
      if (!uri.match(extension) && !uri.match(slash)) {
        uri = `${uri}.html`;
      }
      if (!(request.uri === uri)) {
        console.log("Redirecting", request.uri, uri);
        request.uri = uri;
      }
    }
  }
  return request;
};


exports.handler = handler;
