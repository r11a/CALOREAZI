ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.22

FROM node:22-alpine AS web-builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM ${BUILD_FROM}

RUN apk add --no-cache ca-certificates nginx nodejs npm

WORKDIR /opt/caloreazi
COPY --from=web-builder /build /opt/caloreazi
COPY rootfs /

RUN chmod +x /etc/services.d/app/run /etc/services.d/nginx/run \
    && rm -f /etc/nginx/http.d/default.conf

LABEL \
  io.hass.version="0.6.0" \
  io.hass.type="app" \
  io.hass.arch="amd64"

EXPOSE 8099 8686
