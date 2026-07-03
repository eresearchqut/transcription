/** @type {import('next').NextConfig} */
const path = require("node:path");

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

module.exports = nextConfig;
