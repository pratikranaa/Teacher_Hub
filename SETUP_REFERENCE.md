# Teacher Hub - Setup Quick Reference

## 🚀 One-Click Setup
```bash
git clone <repository-url>
cd Teacher_Hub
./setup.sh
```

## 📋 What Gets Created Automatically

### 🗄️ Database
- **PostgreSQL** database with all migrations applied
- **140 sample users** across all roles
- **10 schools** with realistic data
- **Sample availability schedules**

### 👤 Admin Accounts
| Account | Email | Password | Access |
|---------|-------|----------|---------|
| **Superuser** | admin@teacherhub.com | admin123 | http://localhost:8000/admin |
| **School Admin** | admin1@school.edu | admin123 | http://localhost:3000 |
| **Teacher** | teacher1@school.edu | teacher123 | http://localhost:3000 |
| **External Teacher** | external1@teacher.com | substitute123 | http://localhost:3000 |

### 🐳 Docker Services
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **Database**: PostgreSQL on port 5432
- **Redis**: Cache on port 6379
- **Celery**: Background tasks
- **API Docs**: http://localhost:8000/api/v1

## 🔧 Manual Commands (if needed)

### Database Operations
```bash
# Check migrations
docker-compose exec backend python manage.py showmigrations

# Run migrations
docker-compose exec backend python manage.py migrate

# Create sample data
docker-compose exec backend python manage.py create_sample_data

# Clean sample data
docker-compose exec backend python manage.py cleanup_sample_data
```

### Container Management
```bash
# View running containers
docker ps

# View logs
docker-compose logs <service_name>

# Restart service
docker-compose restart <service_name>

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Development
```bash
# Django shell
docker-compose exec backend python manage.py shell

# Database shell
docker-compose exec db psql -U teacherhub_user -d teacherhub

# Install Python package
docker-compose exec backend pip install <package>

# Install Node package
docker-compose exec frontend npm install <package>
```

## 🔍 Troubleshooting

### Common Issues
1. **Docker not running** → Start Docker Desktop
2. **Port conflicts** → Check `lsof -i :3000` and `lsof -i :8000`
3. **Database issues** → Run `docker-compose down -v` then `./setup.sh`
4. **Build errors** → Run `docker-compose build --no-cache`

### Quick Fixes
```bash
# Complete reset
docker-compose down -v
docker system prune -a
./setup.sh

# Restart specific service
docker-compose restart <service_name>

# View service logs
docker-compose logs -f <service_name>
```

## 📁 Key Files
- `setup.sh` - Automated setup script
- `docker-compose.yml` - Service orchestration
- `env.example` - Environment template
- `DEPLOYMENT_GUIDE.md` - Complete documentation
- `DOCKER_README.md` - Docker-specific docs

## 🎯 Training Flow
1. Run `./setup.sh`
2. Access http://localhost:3000
3. Login with test accounts
4. Demonstrate features per role
5. Show admin panel at http://localhost:8000/admin

---
*For complete documentation, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)* 