ARG NODE_VERSION=24
FROM node:${NODE_VERSION}

# cdklocal points the CDK CLI at the emulator, so the toolkit stack, asset
# publishing and deploys all resolve to MiniStack rather than real AWS.
RUN corepack enable && npm add -g aws-cdk-local aws-cdk

# Keep the pnpm store out of the bind-mounted repo, otherwise the install
# leaves a ~600MB .pnpm-store behind on the host for lint and git to trip over.
ENV npm_config_store_dir=/pnpm-store

WORKDIR /app
CMD ["bash"]
