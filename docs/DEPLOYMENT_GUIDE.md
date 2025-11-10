# Deployment Guide - All Methods

## Comparison of Deployment Methods

| Method                | Setup Time | Difficulty  | Portability    | Best For                                   |
| --------------------- | ---------- | ----------- | -------------- | ------------------------------------------ |
| **🐳 Docker Compose** | 5 minutes  | ⭐ Easy     | ✅ Excellent   | **Recommended** - Production & Development |
| **📜 Auto Script**    | 15-30 min  | ⭐⭐ Medium | ❌ Ubuntu only | Quick Ubuntu setup                         |
| **📖 Manual**         | 30-60 min  | ⭐⭐⭐ Hard | ❌ Ubuntu only | Learning/Customization                     |

---

## Method 1: Docker Compose (Recommended) 🐳

### Why Docker?

- ✅ **Fastest setup** - 5 minutes from zero to running
- ✅ **No dependency conflicts** - Everything isolated
- ✅ **Portable** - Works on any OS (Linux, macOS, Windows)
- ✅ **Consistent** - Same environment everywhere
- ✅ **Easy updates** - Just pull and restart
- ✅ **Easy cleanup** - Remove everything with one command
- ✅ **Scalable** - Easy to add replicas

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- 2GB RAM minimum
- 10GB disk space

### Step 1: Install Docker

**Ubuntu/Debian:**

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

**Other OS:**

- **macOS/Windows:** Install Docker Desktop from https://www.docker.com/products/docker-desktop

### Step 2: Configure Environment

```bash
cd /path/to/junit-dashboard

# Copy environment template
cp .env.docker .env

# Edit environment file
nano .env
```

Update these values:

```env
MONGO_ROOT_PASSWORD=YourSecureRootPassword123!
MONGO_APP_PASSWORD=YourSecureAppPassword123!
ALLOWED_ORIGINS=http://localhost,http://YOUR_SERVER_IP
```

### Step 3: Start Everything

```bash
# Start all services (MongoDB, Backend, Nginx)
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

That's it! The dashboard is now running at `http://localhost`

### Step 4: Verify Installation

```bash
# Health check
curl http://localhost/health

# Upload test file
curl -X POST http://localhost/api/v1/upload \
  -F "file=@sample-test-results.xml"
```

Open browser: `http://localhost` or `http://YOUR_SERVER_IP`

### Docker Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f mongodb
docker compose logs -f nginx

# Restart services
docker compose restart

# Stop services
docker compose stop

# Start services
docker compose start

# Stop and remove everything
docker compose down

# Stop and remove everything including data
docker compose down -v

# Update to latest code
git pull
docker compose build
docker compose up -d

# View running containers
docker compose ps

# Execute command in container
docker compose exec backend sh
docker compose exec mongodb mongosh
```

### Backup MongoDB (Docker)

```bash
# Backup
docker compose exec mongodb mongodump \
  --uri="mongodb://junit_app:PASSWORD@localhost:27017/junit_test_results" \
  --out=/data/backup

docker cp junit-mongodb:/data/backup ./mongodb-backup

# Restore
docker cp ./mongodb-backup junit-mongodb:/data/restore
docker compose exec mongodb mongorestore \
  --uri="mongodb://junit_app:PASSWORD@localhost:27017" \
  /data/restore
```

### Accessing Containers

```bash
# Backend shell
docker compose exec backend sh

# MongoDB shell
docker compose exec mongodb mongosh -u admin -p

# Nginx shell
docker compose exec nginx sh

# View container details
docker compose exec backend env
```

### Production Docker Deployment

For production, you may want to:

1. **Use external MongoDB** (MongoDB Atlas)

    ```yaml
    # In docker-compose.yml, remove mongodb service
    # Update backend MONGODB_URI to Atlas connection string
    ```

2. **Enable HTTPS**

    ```bash
    # Get SSL certificate
    sudo apt install certbot
    sudo certbot certonly --standalone -d your-domain.com

    # Update nginx.conf to use SSL
    # Mount certificates in docker-compose.yml
    ```

3. **Set resource limits**
    ```yaml
    backend:
        deploy:
            resources:
                limits:
                    cpus: '2'
                    memory: 2G
    ```

### Docker Troubleshooting

```bash
# Container won't start
docker compose logs backend

# Port already in use
sudo lsof -i :5000
# Kill process or change port in docker-compose.yml

# Permission denied
sudo chown -R $USER:$USER ./backend/uploads ./backend/logs

# Remove all and start fresh
docker compose down -v
docker compose up -d --build
```

---

## Method 2: Automated Installation Script 📜

### Prerequisites

- Ubuntu 24.04 (or 22.04)
- Sudo access
- Internet connection

### Step 1: Download and Run

```bash
cd /path/to/junit-dashboard

# Run automated installer
sudo ./install-ubuntu.sh
```

The script will:

1. Install MongoDB 7.0
2. Install Node.js 20 LTS
3. Install PM2 and Nginx
4. Configure MongoDB security
5. Set up backend application
6. Configure frontend
7. Start all services

### Step 2: Configure

After installation completes:

```bash
# Edit backend configuration
sudo nano /opt/junit-dashboard/.env

# Update MongoDB passwords and CORS origins
```

### Step 3: Verify

```bash
# Run verification script
./check-installation.sh

# Check services
sudo systemctl status mongod nginx
pm2 status
```

---

## Method 3: Manual Installation 📖

Follow the comprehensive guide in **INSTALLATION.md**

This method gives you full control and understanding of each component.

---

## Comparison Table

### Resource Usage

| Component  | Docker     | Native     |
| ---------- | ---------- | ---------- |
| MongoDB    | ~200MB RAM | ~200MB RAM |
| Backend    | ~100MB RAM | ~100MB RAM |
| Nginx      | ~10MB RAM  | ~10MB RAM  |
| **Total**  | ~310MB RAM | ~310MB RAM |
| Disk Space | ~2GB       | ~1GB       |

### Ease of Updates

| Method     | Update Process                                                      |
| ---------- | ------------------------------------------------------------------- |
| **Docker** | `git pull && docker compose up -d --build`                          |
| **Native** | `cd /opt/junit-dashboard && git pull && npm install && pm2 restart` |

### Backup & Recovery

| Method     | Backup                                  | Restore                                    |
| ---------- | --------------------------------------- | ------------------------------------------ |
| **Docker** | `docker compose exec mongodb mongodump` | `docker compose exec mongodb mongorestore` |
| **Native** | `mongodump --uri=...`                   | `mongorestore --uri=...`                   |

### Scalability

| Method     | Horizontal Scaling          | Load Balancing        |
| ---------- | --------------------------- | --------------------- |
| **Docker** | Easy (docker compose scale) | Easy (nginx upstream) |
| **Native** | Manual                      | Manual                |

---

## Recommendations by Use Case

### 🏢 Production Deployment

**Choose:** Docker Compose

- Easier to manage
- Consistent environments
- Simple updates and rollbacks
- Better resource isolation

### 🧪 Development/Testing

**Choose:** Docker Compose

- Quick setup/teardown
- No pollution of host system
- Easy to share with team

### 📚 Learning/Education

**Choose:** Manual Installation

- Understand each component
- Learn system administration
- Full control and customization

### ⚡ Quick Demo

**Choose:** Docker Compose

- Running in 5 minutes
- No system changes
- Easy cleanup

### 🔒 High Security Requirements

**Choose:** Native Installation

- Full control over security settings
- Direct access to all logs
- Custom hardening possible

---

## Migration Between Methods

### Docker to Native

```bash
# 1. Backup MongoDB from Docker
docker compose exec mongodb mongodump \
  --uri="mongodb://junit_app:PASSWORD@localhost:27017/junit_test_results" \
  --out=/data/backup

# 2. Copy backup out
docker cp junit-mongodb:/data/backup ./mongodb-backup

# 3. Stop Docker
docker compose down

# 4. Install natively following INSTALLATION.md

# 5. Restore data
mongorestore --uri="mongodb://junit_app:PASSWORD@localhost:27017" ./mongodb-backup
```

### Native to Docker

```bash
# 1. Backup MongoDB from native
mongodump --uri="mongodb://junit_app:PASSWORD@localhost:27017/junit_test_results" \
  --out=./mongodb-backup

# 2. Stop native services
pm2 stop all
sudo systemctl stop mongod nginx

# 3. Start Docker
docker compose up -d

# 4. Wait for MongoDB to be ready
sleep 10

# 5. Restore data
docker cp ./mongodb-backup junit-mongodb:/data/restore
docker compose exec mongodb mongorestore \
  --uri="mongodb://junit_app:PASSWORD@localhost:27017" \
  /data/restore
```

---

## Cloud Deployment Options

### Docker on Cloud

**AWS ECS:**

```bash
# Use docker-compose.yml with ECS CLI
ecs-cli compose up
```

**Google Cloud Run:**

```bash
# Build and push
docker build -t gcr.io/PROJECT/junit-dashboard ./backend
docker push gcr.io/PROJECT/junit-dashboard
gcloud run deploy --image gcr.io/PROJECT/junit-dashboard
```

**Azure Container Instances:**

```bash
az container create --resource-group myResourceGroup \
  --name junit-dashboard \
  --image myregistry.azurecr.io/junit-dashboard
```

**DigitalOcean App Platform:**

- Connect GitHub repository
- Select docker-compose.yml
- Deploy automatically

### Kubernetes

Convert Docker Compose to Kubernetes:

```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.31.2/kompose-linux-amd64 -o kompose
chmod +x kompose
sudo mv kompose /usr/local/bin/

# Convert
kompose convert -f docker-compose.yml

# Deploy
kubectl apply -f .
```

---

## Performance Tuning

### Docker Performance

```yaml
# In docker-compose.yml
backend:
    deploy:
        replicas: 3 # Run 3 instances
        resources:
            limits:
                cpus: '2'
                memory: 2G
            reservations:
                cpus: '1'
                memory: 1G
```

### Native Performance

```javascript
// In ecosystem.config.js
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

---

## Security Hardening

### Docker Security

```yaml
# In docker-compose.yml
backend:
    security_opt:
        - no-new-privileges:true
    cap_drop:
        - ALL
    cap_add:
        - NET_BIND_SERVICE
    read_only: true
    tmpfs:
        - /tmp
```

### Network Isolation

```yaml
# Separate networks
networks:
    frontend:
        driver: bridge
    backend:
        driver: bridge
        internal: true # No internet access
```

---

## Monitoring

### Docker Monitoring

```bash
# Resource usage
docker stats

# Health checks
docker compose ps

# Logs
docker compose logs -f --tail=100

# With Prometheus
docker run -d -p 9090:9090 prom/prometheus
# Configure prometheus.yml to scrape Docker metrics
```

### Native Monitoring

```bash
# PM2 monitoring
pm2 monit

# System monitoring
htop

# Logs
pm2 logs
tail -f /var/log/mongodb/mongod.log
tail -f /var/log/nginx/access.log
```

---

## Cost Comparison

### Self-Hosted (Ubuntu Server)

| Provider     | Specs          | Cost/Month |
| ------------ | -------------- | ---------- |
| DigitalOcean | 2GB RAM, 1 CPU | $12        |
| AWS EC2      | t3.small       | $15        |
| Hetzner      | CX21           | $5         |
| **Average**  |                | **$10-15** |

### Cloud Managed

| Service             | Cost/Month  |
| ------------------- | ----------- |
| MongoDB Atlas (M10) | $57         |
| Heroku (Hobby)      | $14         |
| AWS ECS Fargate     | $20-30      |
| **Average**         | **$30-100** |

**Recommendation:** Self-hosted Docker is most cost-effective for small teams.

---

## Quick Start Comparison

### Docker (5 minutes)

```bash
cp .env.docker .env
# Edit .env passwords
docker compose up -d
```

### Auto Script (15 minutes)

```bash
sudo ./install-ubuntu.sh
./check-installation.sh
```

### Manual (60 minutes)

```bash
# Follow INSTALLATION.md step-by-step
```

---

## Final Recommendation

**For 95% of use cases, use Docker Compose:**

✅ Fastest setup
✅ Most portable
✅ Easiest to maintain
✅ Best for teams
✅ Production ready
✅ Easy rollback
✅ Consistent across environments

**Use native installation only if:**

- You need maximum performance (minimal overhead)
- You want to learn system administration
- You have very specific customization needs
- Docker is not allowed in your environment

---

## Next Steps

### After Deployment (Any Method)

1. **Test the installation**

    ```bash
    curl http://localhost/health
    ./ci-cd-examples/upload-test-results.sh
    ```

2. **Configure CI/CD**
    - Copy `ci-cd-examples/Jenkinsfile` or `github-actions.yml`
    - Update API URL to your server
    - Test upload from CI/CD

3. **Set up backups**
    - Schedule daily MongoDB backups
    - Store backups offsite

4. **Enable HTTPS**
    - Get SSL certificate (Let's Encrypt)
    - Update nginx configuration

5. **Monitor and optimize**
    - Check logs regularly
    - Monitor resource usage
    - Tune based on load

---

## Support

- 🐳 **Docker issues:** Check `docker compose logs`
- 📜 **Script issues:** Check script output and logs
- 📖 **Manual issues:** See INSTALLATION.md troubleshooting
- 💬 **General help:** Review documentation files

---

**Ready to deploy? Start with Docker Compose!**

```bash
cp .env.docker .env
nano .env  # Set passwords
docker compose up -d
```

Access at: http://localhost
