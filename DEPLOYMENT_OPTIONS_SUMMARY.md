# Deployment Options - Quick Reference

## 🎯 Recommendation: Use Docker Compose

**Why?** Fastest, easiest, most portable, and production-ready.

---

## Three Deployment Methods

### 🐳 Option 1: Docker Compose (⭐ Recommended)

**Time:** 5 minutes
**Difficulty:** ⭐ Easy
**Best For:** Everyone

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Start dashboard
cp .env.docker .env
nano .env  # Set passwords
docker compose up -d

# Done! Access at http://localhost
```

**Pros:**
- ✅ Fastest setup (5 minutes)
- ✅ Works on any OS (Linux, macOS, Windows)
- ✅ Isolated environment, no conflicts
- ✅ Easy updates (`docker compose up -d --build`)
- ✅ Easy backup/restore
- ✅ Production ready out of the box
- ✅ Easy to scale
- ✅ Portable across clouds

**Cons:**
- ❌ Requires Docker installed
- ❌ Slight overhead (~100MB RAM)

**See:** [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)

---

### 📜 Option 2: Automated Script

**Time:** 15-30 minutes
**Difficulty:** ⭐⭐ Medium
**Best For:** Ubuntu-only, native installation preferred

```bash
sudo ./install-ubuntu.sh
# Script handles everything automatically
```

**Pros:**
- ✅ Fully automated
- ✅ Native performance (no container overhead)
- ✅ Everything integrated with system
- ✅ Familiar tools (systemctl, pm2, etc.)

**Cons:**
- ❌ Ubuntu only
- ❌ Modifies system directly
- ❌ Harder to remove cleanly
- ❌ More complex updates

**See:** [install-ubuntu.sh](install-ubuntu.sh)

---

### 📖 Option 3: Manual Installation

**Time:** 30-60 minutes
**Difficulty:** ⭐⭐⭐ Hard
**Best For:** Learning, custom configuration

Follow step-by-step instructions in [INSTALLATION.md](INSTALLATION.md)

**Pros:**
- ✅ Full understanding of each component
- ✅ Maximum control
- ✅ Custom configuration possible
- ✅ Good for learning

**Cons:**
- ❌ Time-consuming
- ❌ Easy to make mistakes
- ❌ Requires system administration knowledge

---

## Quick Comparison Table

| Feature | Docker | Auto Script | Manual |
|---------|--------|-------------|--------|
| **Setup Time** | 5 min | 15-30 min | 30-60 min |
| **Difficulty** | Easy | Medium | Hard |
| **OS Support** | All | Ubuntu only | Ubuntu only |
| **Updates** | `docker compose up -d --build` | Manual | Manual |
| **Portability** | Excellent | Poor | Poor |
| **Cleanup** | `docker compose down -v` | Complex | Very complex |
| **Production Ready** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Learning Value** | Low | Medium | High |
| **Isolation** | ✅ Complete | ❌ None | ❌ None |
| **Backup** | Easy | Medium | Medium |
| **Scaling** | Easy | Manual | Manual |

---

## Decision Tree

```
Do you want the easiest setup?
├─ YES → Use Docker Compose ✅
└─ NO
    │
    Do you need native performance?
    ├─ YES → Use Automated Script
    └─ NO
        │
        Do you want to learn system administration?
        ├─ YES → Use Manual Installation
        └─ NO → Seriously, use Docker Compose ✅
```

---

## What Each Method Installs

### Docker (All isolated in containers)
- MongoDB 7.0 (container)
- Node.js 20 backend (container)
- Nginx (container)
- No system changes
- Easy to remove

### Native (All installed on system)
- MongoDB 7.0 (system service)
- Node.js 20 (system package)
- PM2 (global npm package)
- Nginx (system service)
- Modifies system
- Complex to remove

---

## Resource Requirements

All methods need:
- 2GB RAM minimum
- 10GB disk space
- Internet connection
- CPU: 1 core minimum

**Docker overhead:** ~100MB RAM (negligible)

---

## Commands Cheat Sheet

### Docker Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Logs
docker compose logs -f

# Restart
docker compose restart

# Update
docker compose up -d --build

# Backup
docker compose exec mongodb mongodump ...

# Status
docker compose ps
```

### Native Commands

```bash
# Start
pm2 start ecosystem.config.js
sudo systemctl start mongod nginx

# Stop
pm2 stop all
sudo systemctl stop mongod nginx

# Logs
pm2 logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart
pm2 restart junit-dashboard-api
sudo systemctl restart mongod nginx

# Status
pm2 status
sudo systemctl status mongod nginx
```

---

## Migration Between Methods

### Docker → Native
1. Backup: `docker compose exec mongodb mongodump`
2. Stop Docker: `docker compose down`
3. Run: `sudo ./install-ubuntu.sh`
4. Restore backup

### Native → Docker
1. Backup: `mongodump`
2. Stop services: `pm2 stop all && sudo systemctl stop mongod nginx`
3. Run: `docker compose up -d`
4. Restore backup

---

## Cloud Deployment

### Docker on Cloud ✅
- Works everywhere: AWS, GCP, Azure, DigitalOcean
- Easy to containerize: `docker-compose.yml` → Kubernetes
- Consistent across environments

### Native on Cloud
- VPS/VM required
- Manual setup on each instance
- Environment differences possible

---

## Production Checklist

### Docker Production

```yaml
✅ Set secure passwords in .env
✅ Configure ALLOWED_ORIGINS
✅ Enable HTTPS (mount SSL certs)
✅ Set resource limits
✅ Configure backups
✅ Set up monitoring
✅ Use external MongoDB (optional)
```

### Native Production

```bash
✅ Set secure passwords in .env
✅ Configure firewall (ufw)
✅ Enable HTTPS (certbot)
✅ Configure PM2 to start on boot
✅ Set up log rotation
✅ Configure backups (cron job)
✅ Set up monitoring
```

---

## Cost Comparison

### Self-Hosted (Either Method)

| Provider | Specs | Cost/Month |
|----------|-------|------------|
| DigitalOcean | 2GB RAM | $12 |
| Hetzner | 2GB RAM | $5 |
| AWS EC2 | t3.small | $15 |

**Average: $10-15/month**

### Managed Services

| Service | Cost/Month |
|---------|------------|
| MongoDB Atlas | $57 |
| Heroku | $14-25 |
| AWS Fargate | $20-30 |

**Average: $30-100/month**

**💡 Best value:** Self-hosted Docker on Hetzner ($5/month)

---

## Security Comparison

### Docker
- ✅ Process isolation
- ✅ Network isolation
- ✅ Easy to apply security policies
- ✅ Non-root containers
- ✅ Immutable infrastructure

### Native
- ✅ Standard Linux security
- ✅ SELinux/AppArmor available
- ✅ Direct system logs
- ⚠️ Services run as system users
- ⚠️ Shared network namespace

**Winner:** Docker (better isolation)

---

## Backup/Recovery

### Docker
```bash
# Backup (1 command)
docker compose exec mongodb mongodump \
  --uri="..." --out=/data/backup
docker cp junit-mongodb:/data/backup ./backup

# Restore (2 commands)
docker cp ./backup junit-mongodb:/data/restore
docker compose exec mongodb mongorestore \
  --uri="..." /data/restore
```

### Native
```bash
# Backup
mongodump --uri="..." --out=./backup

# Restore
mongorestore --uri="..." ./backup
```

**Winner:** Tie (both equally easy)

---

## Monitoring

### Docker
```bash
docker stats  # Resource usage
docker compose logs -f  # Logs
docker compose ps  # Status
# Or use Prometheus + Grafana
```

### Native
```bash
htop  # Resource usage
pm2 monit  # Process monitoring
pm2 logs  # Logs
systemctl status  # Service status
```

**Winner:** Native (more familiar tools)

---

## Final Recommendation by Use Case

| Use Case | Recommended Method |
|----------|-------------------|
| **Just want it to work** | 🐳 Docker |
| **Production deployment** | 🐳 Docker |
| **Development/Testing** | 🐳 Docker |
| **Multiple environments** | 🐳 Docker |
| **Team collaboration** | 🐳 Docker |
| **Cloud deployment** | 🐳 Docker |
| **Maximum performance** | 📜 Native Script |
| **Learning sysadmin** | 📖 Manual |
| **Custom configuration** | 📖 Manual |
| **Ubuntu only, no Docker** | 📜 Native Script |

---

## Getting Started (Right Now!)

### If you have Docker:
```bash
cp .env.docker .env
nano .env  # Set passwords
docker compose up -d
# Open http://localhost
```

### If you don't have Docker:
```bash
# Install Docker (2 minutes)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Then start dashboard
cp .env.docker .env
nano .env
docker compose up -d
```

### If you really don't want Docker:
```bash
sudo ./install-ubuntu.sh
```

---

## Support & Documentation

| Question | See |
|----------|-----|
| How to use Docker? | [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) |
| Compare all methods? | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) |
| Manual installation? | [INSTALLATION.md](INSTALLATION.md) |
| API documentation? | [backend/README.md](backend/README.md) |
| CI/CD integration? | [ci-cd-examples/](ci-cd-examples/) |
| Troubleshooting? | [INSTALLATION.md#troubleshooting](INSTALLATION.md#troubleshooting) |

---

## TL;DR

**Want it working in 5 minutes?**
```bash
docker compose up -d
```

**Don't have Docker and on Ubuntu?**
```bash
sudo ./install-ubuntu.sh
```

**Want to learn everything?**
- Read [INSTALLATION.md](INSTALLATION.md)

---

**95% of users should use Docker Compose.** ✅

It's faster, easier, more portable, and production-ready.
