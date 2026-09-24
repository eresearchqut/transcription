/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  // Give the emulator endpoint a build-time value even when it is unset, so
  // `_app` can tell a local deploy from a deployed one without reading an
  // undefined variable.
  env: {
    NEXT_PUBLIC_AWS_ENDPOINT: process.env.NEXT_PUBLIC_AWS_ENDPOINT ?? "",
  },
};

module.exports = nextConfig;
