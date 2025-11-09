# Docker Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- 2GB RAM available

### Install Docker (if needed)

**Ubuntu/Debian:**

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

**macOS/Windows:**

- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Quick Start

```bash
# 1. Clone or navigate to project directory
cd /path/to/junit-dashboard

# 2. Copy environment file
cp .env.docker .env

# 3. Edit environment (set secure passwords)
nano .env

# 4. Start everything
docker compose up -d

# 5. Open browser
# http://localhost
```

That's it! 🎉

### Verify It's Working

```bash
# Check all services are running
docker compose ps

# Should see:
# NAME              IMAGE              STATUS
# junit-backend     ...                Up (healthy)
# junit-mongodb     mongo:7.0          Up (healthy)
# junit-nginx       nginx:alpine       Up (healthy)

# Test health endpoint
curl http://localhost/health

# Upload sample file
curl -X POST http://localhost/api/v1/upload \
  -F "file=@sample-test-results.xml"
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f mongodb
docker compose logs -f nginx
```

### Manage Services

```bash
# Stop
docker compose stop

# Start
docker compose start

# Restart
docker compose restart

# Stop and remove
docker compose down

# Stop and remove including data
docker compose down -v
```

### Access MongoDB

```bash
# MongoDB shell
docker compose exec mongodb mongosh -u admin -p

# Or with app user
docker compose exec mongodb mongosh \
  -u junit_app \
  -p YOUR_PASSWORD \
  --authenticationDatabase junit_test_results \
  junit_test_results
```

### Update to Latest Version

```bash
git pull
docker compose down
docker compose build
docker compose up -d
```

### Backup Data

```bash
# Backup MongoDB
docker compose exec mongodb mongodump \
  --uri="mongodb://junit_app:PASSWORD@localhost:27017/junit_test_results" \
  --out=/data/backup

# Copy backup to host
docker cp junit-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)
```

### Restore Data

```bash
# Copy backup to container
docker cp ./mongodb-backup junit-mongodb:/data/restore

# Restore
docker compose exec mongodb mongorestore \
  --uri="mongodb://junit_app:PASSWORD@localhost:27017" \
  /data/restore
```

### Troubleshooting

**Port already in use:**

```bash
# Check what's using port 80
sudo lsof -i :80

# Change port in docker-compose.yml:
ports:
  - "8080:80"  # Use port 8080 instead
```

**Permission denied:**

```bash
# Fix permissions
sudo chown -R $USER:$USER ./backend/uploads ./backend/logs
```

**Can't connect to MongoDB:**

```bash
# Check MongoDB logs
docker compose logs mongodb

# Restart MongoDB
docker compose restart mongodb
```

**Container keeps restarting:**

```bash
# View logs
docker compose logs backend

# Check container details
docker compose ps
```

### Production Deployment

For production, update `docker-compose.yml`:

```yaml
services:
    backend:
        deploy:
            replicas: 2
            resources:
                limits:
                    cpus: '2'
                    memory: 2G
        restart: always
```

### Enable HTTPS

1. Get SSL certificate:

    ```bash
    sudo certbot certonly --standalone -d your-domain.com
    ```

2. Mount certificates in `docker-compose.yml`:

    ```yaml
    nginx:
        volumes:
            - /etc/letsencrypt/live/your-domain.com/fullchain.pem:/etc/nginx/ssl/cert.pem:ro
            - /etc/letsencrypt/live/your-domain.com/privkey.pem:/etc/nginx/ssl/key.pem:ro
    ```

3. Uncomment HTTPS section in `nginx.conf`

4. Restart:
    ```bash
    docker compose restart nginx
    ```

### Environment Variables

Edit `.env` file:

```env
# MongoDB passwords (CHANGE THESE!)
MONGO_ROOT_PASSWORD=your-secure-root-password
MONGO_APP_PASSWORD=your-secure-app-password

# CORS (add your domains)
ALLOWED_ORIGINS=http://localhost,http://your-domain.com

# File upload limits
MAX_FILE_SIZE=52428800  # 50MB
MAX_FILES=20
```

### Resource Usage

```bash
# View resource usage
docker stats

# View disk usage
docker system df
```

### Clean Up

```bash
# Remove stopped containers
docker compose rm

# Remove unused images
docker image prune

# Remove all unused data
docker system prune -a
```

### CI/CD Integration

From Jenkins/GitHub Actions, upload to:

```
http://YOUR_SERVER_IP/api/v1/upload
```

Example:

```bash
curl -X POST http://localhost/api/v1/upload \
  -F "file=@test-results.xml" \
  -F 'ci_metadata={"provider":"jenkins","build_id":"123"}'
```

### Scale Backend

```bash
# Run multiple backend instances
docker compose up -d --scale backend=3
```

### Monitoring

```bash
# Install monitoring tools
docker run -d -p 9090:9090 prom/prometheus
docker run -d -p 3000:3000 grafana/grafana

# Configure Prometheus to scrape Docker metrics
```

### Common Commands Reference

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps

# Restart service
docker compose restart backend

# Execute command in container
docker compose exec backend sh

# Stop everything
docker compose down

# Update and restart
git pull && docker compose up -d --build

# Backup database
docker compose exec mongodb mongodump ...

# View resource usage
docker stats
```

### Support

- Check logs: `docker compose logs`
- Health check: `curl http://localhost/health`
- MongoDB: `docker compose exec mongodb mongosh`
- Backend shell: `docker compose exec backend sh`

---

**Need help?** See DEPLOYMENT_GUIDE.md for detailed documentation.

**Ready to deploy?** Just run:

```bash
cp .env.docker .env && nano .env && docker compose up -d
```
