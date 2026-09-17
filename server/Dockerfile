# syntax=docker/dockerfile:1.7
FROM node:22.19.0-alpine AS dependencies
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter giantpay-api...

FROM dependencies AS build
ARG RELEASE_VERSION
ARG GIT_SHA
ARG SOURCE_DATE_EPOCH
COPY server/tsconfig.json server/tsconfig.build.json server/
COPY server/src server/src
COPY server/migrations server/migrations
COPY server/openapi server/openapi
COPY server/scripts server/scripts
RUN pnpm --dir server run build && RELEASE_VERSION=$RELEASE_VERSION GIT_SHA=$GIT_SHA SOURCE_DATE_EPOCH=$SOURCE_DATE_EPOCH RELEASE_OUTPUT_DIR=/workspace/server/release pnpm --dir server run release:metadata && pnpm --filter giantpay-api deploy --prod /opt/giantpay
RUN cp -R server/dist server/migrations server/openapi /opt/giantpay/
RUN cp -R server/release /opt/giantpay/release

FROM node:22.19.0-alpine AS runtime
ENV NODE_ENV=production DEPLOYMENT_ENVIRONMENT=sandbox HOST=0.0.0.0 PORT=4000 TMPDIR=/tmp/giantpay
WORKDIR /app
RUN addgroup -S -g 10001 giantpay && adduser -S -D -H -u 10001 -G giantpay giantpay && mkdir -p /tmp/giantpay && chown giantpay:giantpay /tmp/giantpay
COPY --from=build --chown=giantpay:giantpay /opt/giantpay/ ./
USER 10001:10001
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:4000/v1/health/live',{signal:AbortSignal.timeout(2000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","dist/launch.js","api"]
