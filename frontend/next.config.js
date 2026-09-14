/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  // Give the emulator endpoint a build-time value even when it is unset, so
  // `/login` can fold the local sign-in form away at build time.
  env: {
    NEXT_PUBLIC_AWS_ENDPOINT: process.env.NEXT_PUBLIC_AWS_ENDPOINT ?? "",
  },
};

module.exports = nextConfig;
