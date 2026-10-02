ARG NODE_VERSION=24
FROM node:${NODE_VERSION}

# cdklocal points the CDK CLI at the emulator, so asset publishing and
# deploys resolve to MiniStack rather than real AWS.
RUN corepack enable && npm add -g aws-cdk-local aws-cdk

# Keep the pnpm store outside the bind-mounted repo, so installing does not
# leave one behind on the host.
ENV npm_config_store_dir=/pnpm-store

# @eresearchqut/dmp-api is installed from GitHub Packages. pnpm reads the token
# from the environment when it runs, so the image never holds it.
RUN echo '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}' > /root/.npmrc

WORKDIR /app
CMD ["bash"]
