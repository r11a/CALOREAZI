ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.22

FROM node:22-alpine AS web-builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${BUILD_FROM}

ARG BUILD_COMMIT=unknown
ENV CALOREAZI_BUILD_COMMIT=${BUILD_COMMIT}

RUN apk add --no-cache ca-certificates nginx nodejs npm postgresql17 postgresql17-client su-exec

WORKDIR /opt/caloreazi
COPY --from=web-builder /build /opt/caloreazi
COPY rootfs /

RUN chmod +x /etc/services.d/app/run /etc/services.d/nginx/run /etc/services.d/postgres/run /etc/services.d/backup/run /etc/services.d/analysis-worker/run \
    && rm -f /etc/nginx/http.d/default.conf

LABEL \
  io.hass.version="1.20.8" \
  io.hass.type="app" \
  io.hass.arch="amd64"

EXPOSE 8099 8686
