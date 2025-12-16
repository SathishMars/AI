# Quick Reference - Nginx Sub_filter Proxy

## Status: ✅ Ready to Use

Your nginx reverse proxy is fully configured with sub_filter module for automatic URL rewriting.

## Start the Proxy

```bash
cd /Users/Ramki/Develop/groupize-workflows

docker run -d \
  --name groupize-workflows-nginx \
  -p 8443:443 \
  -p 8080:80 \
  -v $(pwd)/local-dev/nginx/conf.d:/etc/nginx/conf.d \
  -v $(pwd)/certs:/etc/nginx/certs \
  groupize-workflows-nginx:latest
```

## Access the Application

```
https://localhost:8443
```

## Common Commands

```bash
# Check if container is running
docker ps | grep groupize-workflows-nginx

# View logs
docker logs groupize-workflows-nginx

# Test configuration
docker exec groupize-workflows-nginx nginx -t

# Reload configuration (after editing conf.d files)
docker exec groupize-workflows-nginx nginx -s reload

# Stop container
docker stop groupize-workflows-nginx

# Remove container
docker rm groupize-workflows-nginx

# Test health endpoint
curl -k https://localhost:8443/health

# Check URL rewriting
curl -ks https://localhost:8443/users/sign_in | grep localhost:8443 | head -3
```

## What Changed

### Dockerfile
- Compiles nginx 1.27.0 from source with `--with-http_sub_module`
- Final image: `groupize-workflows-nginx:latest` (165 MB)
- No longer uses standard nginx:latest - custom build required

### Configuration (default.conf)
- **`/packs/` location**: Rewrites asset URLs
- **Root `/` location**: Rewrites all content URLs
- **Sub_filter rules**: 
  ```nginx
  sub_filter 'https://testing.app.groupize.com' 'https://localhost:8443';
  sub_filter_once off;
  sub_filter_types text/html text/css text/javascript application/javascript application/json;
  ```

## How It Works

1. Browser requests page from `https://localhost:8443`
2. Nginx proxies to `https://testing.app.groupize.com`
3. Response contains absolute URLs: `https://testing.app.groupize.com/packs/css/...`
4. Sub_filter rewrites them to: `https://localhost:8443/packs/css/...`
5. Browser loads assets from same origin → CSP allows them ✅

## CSP Issue: RESOLVED

**Before**: Assets blocked by CSP (cross-origin from `localhost:8443`)
**Now**: Assets load from `localhost:8443` (same origin - no CSP blocking)

## Files

- **Image Build**: `/local-dev/nginx/Dockerfile`
- **Nginx Config**: `/local-dev/nginx/conf.d/default.conf`
- **SSL Certs**: `/certs/localhost.pem` and `localhost-key.pem`
- **Documentation**: 
  - `/local-dev/NGINX-SUBFITER-IMPLEMENTATION.md` (detailed)
  - `/local-dev/NGINX-CSP-SOLUTION.md` (background)
  - `/local-dev/NGINX-REVERSE-PROXY-SETUP.md` (setup guide)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8443 already in use | `lsof -i :8443` then `kill -9 <PID>` |
| Connection refused | Check if container is running: `docker ps` |
| SSL certificate errors | Use `-k` flag with curl: `curl -k ...` |
| Config syntax error | Test first: `docker exec ... nginx -t` |
| Changes not applying | Reload config: `docker exec ... nginx -s reload` |

## Building the Image

If you need to rebuild (after Dockerfile changes):

```bash
docker build -f local-dev/nginx/Dockerfile -t groupize-workflows-nginx:latest .
```

Build time: ~2-3 minutes (nginx compilation)

## Performance Notes

- SSL/TLS: TLS 1.2 and 1.3
- HTTP/2: Enabled for performance
- Gzip: Disabled (required for sub_filter)
- Asset caching: 1 day max-age
- Compression: Handle by browser (Accept-Encoding header cleared)
