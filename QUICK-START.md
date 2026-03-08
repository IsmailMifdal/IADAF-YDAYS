# 🚀 Quick Start - Running All Services

This guide will help you start all IA-DAF services quickly and easily.

## Prerequisites

Make sure you have:
- ✅ Java 17+ installed
- ✅ Maven 3.8+ installed
- ✅ Docker Desktop running
- ✅ At least 8GB of RAM available

## Option 1: Start ALL Services Automatically (Recommended)

This is the easiest way to run all services at once:

```bash
# Make sure Docker is running first
docker ps

# Start all services in the background
./start-all-services.sh
```

This script will:
1. ✅ Check all prerequisites (Java, Maven, Docker)
2. ✅ Create `.env` file if missing
3. ✅ Start Docker services (PostgreSQL, Keycloak)
4. ✅ Compile all microservices
5. ✅ Start all services in the correct order
6. ✅ Wait for each service to be ready
7. ✅ Verify all services are running

**Wait time**: ~5-10 minutes for all services to start

### Check Service Status

```bash
./status-services.sh
```

This shows:
- 📊 Which services are running
- 🔍 Eureka registration status
- 🔗 URLs for all services

### Stop All Services

```bash
./stop-all-services.sh
```

This gracefully stops all services in the correct order.

### View Logs

```bash
# View logs for a specific service
tail -f logs/discovery-service.log
tail -f logs/user-service.log
tail -f logs/api-gateway.log

# View all errors
grep -i error logs/*.log | tail -20
```

## Option 2: Start Services Individually

If you prefer to start services one at a time:

```bash
# Interactive menu to start one service
./start-services.sh
```

Choose from: `discovery`, `user`, `gateway`, `demarches`, `document`, `analytics`, `ai`, or `all`

## Option 3: Manual Start (Multiple Terminals)

### Terminal 1 - Docker Infrastructure
```bash
docker compose up -d
```

### Terminal 2 - Discovery Service (MUST start first!)
```bash
cd discovery-service
mvn spring-boot:run
```
**Wait** until you see: `Started DiscoveryServiceApplication`

### Terminal 3 - API Gateway
```bash
cd api-gateway
mvn spring-boot:run
```

### Terminal 4-7 - Microservices
```bash
# Terminal 4
cd user-service && mvn spring-boot:run

# Terminal 5
cd demarches-service && mvn spring-boot:run

# Terminal 6
cd document-service && mvn spring-boot:run

# Terminal 7
cd analytics-service && mvn spring-boot:run

# Terminal 8
cd ai-service && mvn spring-boot:run
```

## Verify Everything is Working

### 1. Check Eureka Dashboard
Open http://localhost:8761

You should see all services registered:
- API-GATEWAY
- USER-SERVICE
- DEMARCHES-SERVICE
- DOCUMENT-SERVICE
- ANALYTICS-SERVICE
- AI-SERVICE

### 2. Test API Gateway
```bash
curl http://localhost:8080/actuator/health
```

Should return: `{"status":"UP"}`

### 3. Get an Authentication Token
```bash
export TOKEN=$(curl -s -X POST 'http://localhost:8180/realms/iadaf/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=iadaf-frontend' \
  -d 'grant_type=password' \
  -d 'username=admin@iadaf.com' \
  -d 'password=admin123' \
  | jq -r '.access_token')

echo $TOKEN
```

### 4. Test Authenticated Endpoints
```bash
# Get current user info
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq

# Test user service
curl http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Discovery (Eureka) | 8761 | http://localhost:8761 |
| API Gateway | 8080 | http://localhost:8080 |
| User Service | 8081 | http://localhost:8081 |
| Demarches Service | 8082 | http://localhost:8082 |
| Document Service | 8083 | http://localhost:8083 |
| Analytics Service | 8085 | http://localhost:8085 |
| AI Service | 8086 | http://localhost:8086 |
| Keycloak | 8180 | http://localhost:8180 |
| PostgreSQL | 5432 | localhost:5432 |
| pgAdmin | 5050 | http://localhost:5050 |

## Common Issues

### Issue: Port already in use

**Solution**: Find and kill the process using the port
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>
```

### Issue: Service won't start

**Solution**: Check the logs
```bash
tail -f logs/<service-name>.log
```

Look for errors related to:
- Database connection
- Eureka registration
- Port conflicts

### Issue: Eureka shows no services

**Solution**:
1. Make sure Discovery Service started first
2. Wait 30 seconds for services to register
3. Check if services are actually running: `./status-services.sh`

### Issue: Can't connect to PostgreSQL

**Solution**:
```bash
# Restart Docker services
docker compose down
docker compose up -d

# Wait 30 seconds
sleep 30

# Test connection
docker exec -it iadaf-postgres psql -U iadaf_user -d iadaf_db -c "SELECT 1;"
```

## Restart Everything

If you want to do a complete restart:

```bash
# Stop all services
./stop-all-services.sh

# Stop Docker
docker compose down

# Clean up
rm -rf logs/ pids/

# Start Docker
docker compose up -d
sleep 30

# Start all services
./start-all-services.sh
```

## Production Deployment

For production, consider:
- Using Docker Compose for all services (not just infrastructure)
- Setting up proper environment variables
- Using health checks and restart policies
- Implementing proper monitoring (Prometheus, Grafana)
- Setting up log aggregation (ELK stack)

## Need Help?

- 📖 See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed troubleshooting
- 📖 See [STARTUP-GUIDE.md](STARTUP-GUIDE.md) for step-by-step instructions
- 📖 See [DOCKER.md](DOCKER.md) for Docker configuration details
- 📖 See [KEYCLOAK.md](KEYCLOAK.md) for authentication details
