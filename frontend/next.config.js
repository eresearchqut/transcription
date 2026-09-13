/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  // Give the emulator endpoint a build-time value even when it is unset, so
  // that `/login` can fold away the local sign-in form rather than keeping a
  // runtime lookup that pulls the component into a deployed bundle.
  env: {
    NEXT_PUBLIC_AWS_ENDPOINT: process.env.NEXT_PUBLIC_AWS_ENDPOINT ?? "",
  },
};

module.exports = nextConfig;
