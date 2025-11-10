# 🚀 START HERE - JUnit Dashboard Setup

## Choose Your Deployment Method

### 🐳 Option 1: Docker (Recommended - 5 minutes)

**Best for:** Everyone. Easiest, fastest, works everywhere.

```bash
# 1. Install Docker (if needed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Configure
cp .env.docker .env
nano .env  # Change passwords

# 3. Start
docker compose up -d

# 4. Done! Open http://localhost
```

✅ Works on Linux, macOS, Windows
✅ No system modifications
✅ Easy to update and remove

**📖 Full Guide:** [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)

---

### 📜 Option 2: Automated Script (15 minutes)

**Best for:** Ubuntu servers, prefer native installation.

```bash
sudo ./install-ubuntu.sh
```

The script automatically installs:

- MongoDB 7.0
- Node.js 20 LTS
- PM2, Nginx
- Backend & Frontend
- Generates secure passwords

✅ Fully automated
✅ Native performance
✅ Ubuntu 24.04 and 22.04

---

### 📖 Option 3: Manual (60 minutes)

**Best for:** Learning, custom configuration.

Follow step-by-step: [INSTALLATION.md](INSTALLATION.md)

---

## Quick Comparison

| Method     | Time   | Difficulty  | Portability |
| ---------- | ------ | ----------- | ----------- |
| **Docker** | 5 min  | Easy ⭐     | Excellent   |
| **Script** | 15 min | Medium ⭐⭐ | Ubuntu only |
| **Manual** | 60 min | Hard ⭐⭐⭐ | Ubuntu only |

---

## After Installation

### 1. Test It Works

```bash
# Upload sample file
curl -X POST http://localhost/api/v1/upload \
  -F "file=@sample-test-results.xml"

# Open in browser
# http://localhost (or your server IP)
```

### 2. Integrate with CI/CD

**Jenkins:**

- Copy `ci-cd-examples/Jenkinsfile` to your project
- Update `JUNIT_API_URL`

**GitHub Actions:**

- Copy `ci-cd-examples/github-actions.yml` to `.github/workflows/`
- Add `JUNIT_API_URL` secret

**Manual Upload:**

```bash
./ci-cd-examples/upload-test-results.sh ./test-results
```

### 3. Enable HTTPS (Optional)

**Docker:**

```bash
sudo certbot certonly --standalone -d your-domain.com
# Mount certs in docker-compose.yml
docker compose restart nginx
```

**Native:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Documentation Index

### Getting Started

- **[START_HERE.md](START_HERE.md)** ← You are here
- **[DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)** - Docker in 5 minutes
- **[DEPLOYMENT_OPTIONS_SUMMARY.md](DEPLOYMENT_OPTIONS_SUMMARY.md)** - Compare all methods
- **[README.md](README.md)** - Project overview

### Installation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[INSTALLATION.md](INSTALLATION.md)** - Manual step-by-step
- **[install-ubuntu.sh](install-ubuntu.sh)** - Automated script

### Reference

- **[backend/README.md](backend/README.md)** - Backend API docs
- **[MONGODB_BACKEND_SETUP.md](MONGODB_BACKEND_SETUP.md)** - Technical details
- **[ci-cd-examples/](ci-cd-examples/)** - CI/CD integration

### Verification

- **[check-installation.sh](check-installation.sh)** - Verify installation

---

## Common Commands

### Docker

```bash
docker compose up -d        # Start
docker compose down         # Stop
docker compose logs -f      # View logs
docker compose restart      # Restart
docker compose ps           # Status
```

### Native

```bash
pm2 status                  # Backend status
sudo systemctl status mongod nginx  # Services
pm2 logs                    # Backend logs
pm2 restart junit-dashboard-api     # Restart backend
```

---

## Troubleshooting

### Docker Issues

```bash
# View logs
docker compose logs backend

# Restart everything
docker compose restart

# Remove and start fresh
docker compose down -v
docker compose up -d
```

### Native Issues

```bash
# Check services
sudo systemctl status mongod nginx
pm2 status

# View logs
pm2 logs junit-dashboard-api
sudo tail -f /var/log/mongodb/mongod.log

# Restart services
pm2 restart junit-dashboard-api
sudo systemctl restart mongod nginx
```

### Can't Access Dashboard

```bash
# Check if backend is responding
curl http://localhost:5000/health

# Check firewall
sudo ufw status
sudo ufw allow 80
```

---

## Need Help?

1. **Check documentation:**
    - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting)
    - [INSTALLATION.md](INSTALLATION.md#troubleshooting)

2. **Verify installation:**

    ```bash
    ./check-installation.sh
    ```

3. **Check logs:**
    - Docker: `docker compose logs`
    - Native: `pm2 logs`

---

## Quick Decision Guide

**Answer these questions:**

1. Do you have Docker installed?
    - **Yes** → Use Docker ✅
    - **No** → Continue to Q2

2. Are you on Ubuntu 24.04 or 22.04?
    - **Yes** → Continue to Q3
    - **No** → Install Docker, then use Docker ✅

3. Do you want to learn system administration?
    - **Yes** → Use Manual Installation
    - **No** → Use Automated Script

4. Still not sure?
    - → Use Docker (it's the easiest) ✅

---

## The Fastest Path (Docker)

```bash
# Copy these commands and run them:

# 1. Get Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# 2. Configure
cd /path/to/junit-dashboard
cp .env.docker .env
nano .env  # Set MONGO_ROOT_PASSWORD and MONGO_APP_PASSWORD

# 3. Start
docker compose up -d

# 4. Verify
curl http://localhost/health

# 5. Open browser
firefox http://localhost
# or
google-chrome http://localhost
```

**That's it!** Your dashboard is running. 🎉

---

## Next Steps After Setup

1. **Upload test results:**
    - Drag & drop XML files in browser
    - Or use API: `curl -X POST http://localhost/api/v1/upload -F "file=@test.xml"`

2. **Integrate CI/CD:**
    - See `ci-cd-examples/` directory
    - Jenkins: Copy Jenkinsfile
    - GitHub Actions: Copy workflow YAML

3. **Set up backups:**
    - Docker: `docker compose exec mongodb mongodump ...`
    - Native: `mongodump --uri=...`
    - Schedule with cron

4. **Enable HTTPS:**
    - Get certificate: `certbot`
    - Configure nginx
    - Restart services

5. **Monitor:**
    - Check logs regularly
    - Set up alerts
    - Monitor disk space

---

## Success Criteria

✅ Dashboard accessible in browser
✅ Health check returns OK: `curl http://localhost/health`
✅ Can upload XML file
✅ Test results display in dashboard
✅ Can upload from CI/CD pipeline

---

## Resources

- **Docker Hub:** https://hub.docker.com
- **MongoDB Docs:** https://docs.mongodb.com
- **Node.js Docs:** https://nodejs.org
- **Nginx Docs:** https://nginx.org/en/docs/

---

## Summary

| If you want...  | Use... | Time   |
| --------------- | ------ | ------ |
| Easiest setup   | Docker | 5 min  |
| Ubuntu native   | Script | 15 min |
| Maximum control | Manual | 60 min |

**Recommended: Docker Compose** 🐳

It's the fastest, easiest, and most portable option.

---

**Ready?** Pick your method above and follow the instructions!

**Still confused?** Just run this:

```bash
curl -fsSL https://get.docker.com | sh
cp .env.docker .env
nano .env
docker compose up -d
```

Then open http://localhost in your browser! 🚀
