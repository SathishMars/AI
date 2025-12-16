# Nginx Dockerfile for local development reverse proxy
# Routes /aime/* to Next.js dev server (port 3000)
# Routes /* to https://testing.app.groupize.com

ARG NGINX_DOCKER_IMAGE_TAG=1.29-alpine-slim
FROM nginx:${NGINX_DOCKER_IMAGE_TAG}

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create directories for certificates (to be mounted at runtime)
RUN mkdir -p /etc/nginx/certs

# Expose ports for HTTPS and HTTP
EXPOSE 443 80
STOPSIGNAL SIGTERM

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
