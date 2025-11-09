# Docker Troubleshooting Guide

## Common Issues and Solutions

### Build Errors

#### Error: "npm ci can only install with an existing package-lock.json"

**Symptom:**
```
ERROR [5/7] RUN npm ci --only=production
npm error code EUSAGE
npm error The `npm ci` command can only install with an existing package-lock.json
```

**Solution:**
The `package-lock.json` file is now included in the repository. If you cloned from an older version:

```bash
cd backend
npm install
cd ..
docker compose build
docker compose up -d
```

**Fixed:** The Dockerfile now uses `npm install --omit=dev` instead of `npm ci --only=production`

---

#### Error: Port already in use

**Symptom:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use
```

**Solution:**

Check what's using the port:
```bash
# Check port 80
sudo lsof -i :80
# or
sudo netstat -tlnp | grep :80

# Check port 5000
sudo lsof -i :5000
```

**Option 1:** Stop the conflicting service:
```bash
# If Apache is running
sudo systemctl stop apache2

# If Nginx is running
sudo systemctl stop nginx
```

**Option 2:** Change the port in `docker-compose.yml`:
```yaml
nginx:
  ports:
    - "8080:80"  # Use port 8080 instead
```

Then access at `http://localhost:8080`

---

#### Error: Cannot connect to Docker daemon

**Symptom:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution:**

1. Check if Docker is running:
```bash
sudo systemctl status docker
```

2. Start Docker:
```bash
sudo systemctl start docker
```

3. Add user to docker group:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

4. Verify:
```bash
docker --version
docker ps
```

---

### Container Issues

#### Backend container keeps restarting

**Check logs:**
```bash
docker compose logs backend
```

**Common causes:**

1. **MongoDB not ready:**
```bash
# Check MongoDB status
docker compose ps mongodb
docker compose logs mongodb

# Solution: Wait for MongoDB to be healthy
docker compose up -d --wait
```

2. **Environment variables not set:**
```bash
# Check if .env exists
ls -la .env

# Copy from template
cp .env.docker .env
nano .env
```

3. **MongoDB connection failed:**
```bash
# Check MONGODB_URI in .env
cat .env | grep MONGODB_URI

# Test MongoDB connection
docker compose exec mongodb mongosh -u junit_app -p
```

---

#### MongoDB authentication failed

**Symptom:**
```
MongoServerError: Authentication failed
```

**Solution:**

1. Check passwords match in `.env` and `init-mongo.js`:
```bash
cat .env | grep MONGO_APP_PASSWORD
```

2. Recreate MongoDB with correct credentials:
```bash
# Remove MongoDB data
docker compose down -v

# Start fresh
docker compose up -d
```

---

#### Nginx returns 502 Bad Gateway

**Symptom:**
Browser shows "502 Bad Gateway"

**Solution:**

1. Check if backend is running:
```bash
docker compose ps backend
docker compose logs backend
```

2. Check backend health:
```bash
docker compose exec backend wget -q -O- http://localhost:5000/health
```

3. Restart backend:
```bash
docker compose restart backend
```

---

### Network Issues

#### Can't access dashboard from external IP

**Solution:**

1. Check firewall:
```bash
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

2. Check Docker network:
```bash
docker network ls
docker network inspect junit-dashboard_junit-network
```

3. Update ALLOWED_ORIGINS in `.env`:
```env
ALLOWED_ORIGINS=http://localhost,http://YOUR_SERVER_IP,http://YOUR_DOMAIN
```

4. Restart:
```bash
docker compose restart backend
```

---

#### CORS errors in browser console

**Symptom:**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:**

Update `.env` file:
```env
ALLOWED_ORIGINS=http://localhost,http://192.168.1.100,http://your-domain.com
```

Restart backend:
```bash
docker compose restart backend
```

---

### Data Issues

#### Lost all data after `docker compose down`

**Cause:** Using `docker compose down -v` removes volumes

**Prevention:**
```bash
# Stop without removing volumes
docker compose down

# Or just stop
docker compose stop
```

**Recovery:**
If you have a backup:
```bash
docker compose up -d
docker cp ./mongodb-backup junit-mongodb:/data/restore
docker compose exec mongodb mongorestore --uri="..." /data/restore
```

---

#### Database not persisting data

**Check volume:**
```bash
docker volume ls | grep mongodb
docker volume inspect junit-dashboard_mongodb_data
```

**Solution:**
Ensure volume is defined in `docker-compose.yml`:
```yaml
volumes:
  mongodb_data:
    driver: local
```

---

### Performance Issues

#### Containers using too much memory

**Check resource usage:**
```bash
docker stats
```

**Solution:**

Add resource limits in `docker-compose.yml`:
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '0.5'
        memory: 512M
```

Restart:
```bash
docker compose up -d
```

---

#### Slow upload speeds

**Solution:**

1. Increase timeouts in `nginx.conf`:
```nginx
proxy_connect_timeout 600;
proxy_send_timeout 600;
proxy_read_timeout 600;
send_timeout 600;
client_max_body_size 100M;
```

2. Restart:
```bash
docker compose restart nginx
```

---

### Update Issues

#### Changes not reflected after git pull

**Solution:**

1. Rebuild containers:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

2. Or force recreate:
```bash
docker compose up -d --force-recreate
```

---

### Permission Issues

#### Cannot write to uploads directory

**Symptom:**
```
Error: EACCES: permission denied, open '/app/uploads/...'
```

**Solution:**

Fix permissions on host:
```bash
chmod 755 backend/uploads
chmod 755 backend/logs
```

Or run container as your user:
```yaml
backend:
  user: "1000:1000"  # Your UID:GID
```

---

### SSL/HTTPS Issues

#### Certificate not found

**Symptom:**
```
nginx: [emerg] cannot load certificate "/etc/nginx/ssl/cert.pem"
```

**Solution:**

1. Check certificate exists:
```bash
ls -la /etc/letsencrypt/live/your-domain.com/
```

2. Mount correctly in `docker-compose.yml`:
```yaml
nginx:
  volumes:
    - /etc/letsencrypt/live/your-domain.com/fullchain.pem:/etc/nginx/ssl/cert.pem:ro
    - /etc/letsencrypt/live/your-domain.com/privkey.pem:/etc/nginx/ssl/key.pem:ro
```

3. Restart:
```bash
docker compose restart nginx
```

---

## Debugging Commands

### View all logs
```bash
docker compose logs -f
```

### View specific service logs
```bash
docker compose logs -f backend
docker compose logs -f mongodb
docker compose logs -f nginx
```

### Check container status
```bash
docker compose ps
```

### Execute commands in containers
```bash
# Backend shell
docker compose exec backend sh

# MongoDB shell
docker compose exec mongodb mongosh -u admin -p

# Nginx shell
docker compose exec nginx sh
```

### Inspect containers
```bash
docker compose exec backend env
docker compose exec backend cat /etc/hosts
docker compose exec backend netstat -tlnp
```

### Check networks
```bash
docker network ls
docker network inspect junit-dashboard_junit-network
```

### Check volumes
```bash
docker volume ls
docker volume inspect junit-dashboard_mongodb_data
```

### Resource usage
```bash
docker stats
```

### Disk usage
```bash
docker system df
```

---

## Clean Slate

If nothing works, start fresh:

```bash
# Stop and remove everything
docker compose down -v

# Remove images
docker compose rm -f
docker rmi $(docker images -q junit-dashboard*)

# Clean Docker system
docker system prune -a

# Start fresh
cp .env.docker .env
nano .env  # Set passwords
docker compose build --no-cache
docker compose up -d

# Verify
docker compose ps
curl http://localhost/health
```

---

## Health Checks

### Check all services are healthy
```bash
docker compose ps

# Should show (healthy) for all services
# NAME              STATUS
# junit-backend     Up (healthy)
# junit-mongodb     Up (healthy)
# junit-nginx       Up (healthy)
```

### Test backend API
```bash
curl http://localhost/health
```

### Test MongoDB
```bash
docker compose exec mongodb mongosh \
  -u junit_app \
  -p YOUR_PASSWORD \
  --authenticationDatabase junit_test_results \
  --eval "db.runCommand({ping: 1})"
```

### Test Nginx
```bash
curl -I http://localhost
```

---

## Getting Help

1. **Check logs first:**
   ```bash
   docker compose logs -f
   ```

2. **Verify configuration:**
   ```bash
   cat .env
   docker compose config
   ```

3. **Check system resources:**
   ```bash
   docker stats
   df -h
   free -h
   ```

4. **Review documentation:**
   - [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)
   - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## Common Solutions Summary

| Problem | Quick Fix |
|---------|-----------|
| Port in use | `sudo lsof -i :80` then stop service or change port |
| Container restarting | `docker compose logs backend` |
| Can't connect | Check `.env` and `ALLOWED_ORIGINS` |
| CORS error | Add your domain to `ALLOWED_ORIGINS` |
| Auth failed | `docker compose down -v && docker compose up -d` |
| Changes not applied | `docker compose build --no-cache` |
| Lost data | Don't use `docker compose down -v` |
| 502 error | `docker compose restart backend` |
| Permission error | `chmod 755 backend/uploads` |

---

**Still stuck?** Run these diagnostic commands and check output:

```bash
docker compose ps
docker compose logs --tail=50
docker compose config
cat .env
curl http://localhost/health
```
