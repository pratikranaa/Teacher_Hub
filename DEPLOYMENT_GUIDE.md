# Teacher Hub - Complete Deployment Guide

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [What Happens During Setup](#what-happens-during-setup)
3. [Database Migrations & Sample Data](#database-migrations--sample-data)
4. [Account Creation & Credentials](#account-creation--credentials)
5. [Service Architecture](#service-architecture)
6. [Manual Setup (Alternative)](#manual-setup-alternative)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
Before running the setup, ensure Docker is installed:

**macOS:**
```bash
# Install Docker Desktop
brew install --cask docker
# Or download from: https://docs.docker.com/desktop/install/mac-install/
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install docker.io docker-compose
# Or install Docker Desktop from: https://docs.docker.com/desktop/install/linux-install/
```

**Windows:**
```bash
# Download Docker Desktop from: https://docs.docker.com/desktop/install/windows-install/
# Or install via Chocolatey: choco install docker-desktop
```

### One-Click Setup
```bash
# Clone the repository
git clone <repository-url>
cd Teacher_Hub

# Run the automated setup script
./setup.sh
```

**That's it!** The script handles everything automatically.

> **Note:** If Docker is not installed, the setup script will provide platform-specific installation instructions.

### Access Points After Setup
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **API Documentation**: http://localhost:8000/api/v1

---

## 🔧 What Happens During Setup

The `setup.sh` script performs the following steps **automatically**:

### 1. **System Requirements Check**
- Verifies Docker and Docker Compose are installed
- Provides platform-specific installation guidance if missing
- Checks for required system dependencies
- Validates Docker daemon is running

### 2. **Environment Configuration**
- Creates `.env` file from `env.example` template
- Configures database credentials
- Sets up email configuration (optional)
- Configures Redis and Celery settings

### 3. **Docker Services Build & Start**
```bash
# These commands run automatically:
docker-compose down -v          # Clean previous setup
docker-compose build --no-cache # Build all containers
docker-compose up -d            # Start all services
```

### 4. **Database Setup**
```bash
# Automatic database initialization:
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py create_sample_data
```

### 5. **Admin Account Creation**
```bash
# Automatic superuser creation:
docker-compose exec backend python manage.py shell -c "
from accounts.models import User
user = User.objects.create_superuser(
    username='admin',
    email='admin@teacherhub.com',
    password='admin123',
    user_type='SCHOOL_ADMIN'
)
"
```

### 6. **Service Health Check**
- Verifies all containers are running
- Checks database connectivity
- Validates API endpoints

---

## 🗄️ Database Migrations & Sample Data

### Database Migrations
The following migrations are applied automatically:

#### **Accounts App**
- `0001_initial.py` - Creates User model and related tables
- `0002_alter_schoolstaff_unique_together_and_more.py` - Updates staff relationships

#### **Substitutes App**
- `0001_initial.py` - Creates substitute request system
- `0002_requestinvitation_batch_number_and_more.py` - Adds batch processing
- `0003_substituterequest_host_link_and_more.py` - Adds video integration
- `0004_improve_notifications.py` - Enhances notification system

#### **Teaching Sessions App**
- `0001_initial.py` - Creates session recording system
- `0002_sessionrecording_history_id_and_more.py` - Adds session history

### Sample Data Creation
The `create_sample_data.py` command creates:

#### **Schools (10 schools)**
- Delhi Public School
- St. Mary's School
- Modern School
- Kendriya Vidyalaya
- Army Public School
- Ryan International
- DAV Public School
- Cambridge International
- Oxford Public School
- Heritage School

#### **Users (140 total users)**
- **10 School Admins** (1 per school)
- **50 Internal Teachers** (5 per school)
- **50 External Teachers** (independent substitutes)
- **30 Students** (3 per school)

#### **Additional Data**
- Teacher profiles with subjects and qualifications
- Student profiles with grade levels
- School staff assignments
- Sample availability schedules

---

## 👤 Account Creation & Credentials

### Automatically Created Accounts

#### **Django Superuser (Admin Panel Access)**
- **Email**: admin@teacherhub.com
- **Username**: admin
- **Password**: admin123
- **Access**: http://localhost:8000/admin
- **Purpose**: Full system administration

#### **Sample Test Accounts**

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| **School Admin** | admin1@school.edu | admin123 | School management |
| **Internal Teacher** | teacher1@school.edu | teacher123 | Create substitute requests |
| **External Teacher** | external1@teacher.com | substitute123 | Accept substitute requests |
| **Student** | student1@school.edu | student123 | View sessions |

### Account Creation Process
```python
# This code runs automatically during setup:
from accounts.models import User, School, TeacherProfile

# Create schools
for school_name in school_names:
    school = School.objects.create(
        school_name=school_name,
        category="SECONDARY",
        address=f"Education Street",
        city="New Delhi"
    )

# Create users for each role
for i in range(10):
    # School Admin
    admin = User.objects.create_user(
        username=f"admin{i+1}",
        email=f"admin{i+1}@school.edu",
        password="admin123",
        user_type="SCHOOL_ADMIN"
    )
    
    # Internal Teachers
    for j in range(5):
        teacher = User.objects.create_user(
            username=f"teacher{i*5+j+1}",
            email=f"teacher{i*5+j+1}@school.edu",
            password="teacher123",
            user_type="INTERNAL_TEACHER"
        )
        # Create teacher profile with subjects
        TeacherProfile.objects.create(
            user=teacher,
            subjects=["Mathematics", "Science"],
            qualifications="B.Ed, M.Sc"
        )
```

---

## 🏗️ Service Architecture

### Docker Services Created

#### **1. PostgreSQL Database**
- **Container**: `teacher_hub_db`
- **Port**: 5432
- **Volume**: `teacher_hub_postgres_data`
- **Purpose**: Main application database

#### **2. Redis Cache**
- **Container**: `teacher_hub_redis`
- **Port**: 6379
- **Purpose**: Caching and Celery message broker

#### **3. Django Backend**
- **Container**: `teacher_hub_backend`
- **Port**: 8000
- **Purpose**: REST API and WebSocket server

#### **4. Next.js Frontend**
- **Container**: `teacher_hub_frontend`
- **Port**: 3000
- **Purpose**: User interface

#### **5. Celery Worker**
- **Container**: `teacher_hub_celery_worker`
- **Purpose**: Background task processing

#### **6. Celery Beat**
- **Container**: `teacher_hub_celery_beat`
- **Purpose**: Scheduled task management

#### **7. Nginx (Production)**
- **Container**: `teacher_hub_nginx`
- **Ports**: 80, 443
- **Purpose**: Reverse proxy and SSL termination

### Service Dependencies
```yaml
# Services start in this order:
1. PostgreSQL Database
2. Redis Cache
3. Django Backend (depends on DB + Redis)
4. Celery Worker (depends on Backend)
5. Celery Beat (depends on Backend)
6. Frontend (depends on Backend)
7. Nginx (depends on Frontend + Backend)
```

---

## 🔧 Manual Setup (Alternative)

If you prefer to run setup manually instead of using the script:

### 1. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### 2. Build and Start Services
```bash
# Build all containers
docker-compose build

# Start services
docker-compose up -d
```

### 3. Database Setup
```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create sample data
docker-compose exec backend python manage.py create_sample_data

# Create superuser
docker-compose exec backend python manage.py shell -c "
from accounts.models import User
User.objects.create_superuser(
    username='admin',
    email='admin@teacherhub.com',
    password='admin123',
    user_type='SCHOOL_ADMIN'
)
"
```

### 4. Verify Setup
```bash
# Check container status
docker ps

# Test API endpoints
curl http://localhost:8000/api/v1/
curl http://localhost:3000
```

---

## 🚀 Production Deployment

### Environment Variables for Production
```bash
# Database
DATABASE_URL=postgresql://user:password@db:5432/teacherhub
POSTGRES_DB=teacherhub
POSTGRES_USER=teacherhub_user
POSTGRES_PASSWORD=secure_password

# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Redis
REDIS_URL=redis://redis:6379/0

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Production Deployment Steps
```bash
# 1. Update environment for production
cp env.example .env.production
# Edit .env.production with production values

# 2. Deploy with production config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. Set up SSL certificates (if using Nginx)
docker-compose exec nginx certbot --nginx -d yourdomain.com

# 4. Set up backups
docker-compose exec backend python manage.py dbbackup
```

---

## 🔍 Troubleshooting

### Common Issues

#### **1. Docker Not Running**
```bash
# Start Docker Desktop
open -a Docker

# Verify Docker is running
docker ps
```

#### **2. Port Conflicts**
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :8000
lsof -i :5432

# Stop conflicting services
sudo kill -9 <PID>
```

#### **3. Database Connection Issues**
```bash
# Check database logs
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d
```

#### **4. Migration Errors**
```bash
# Check migration status
docker-compose exec backend python manage.py showmigrations

# Reset migrations (if needed)
docker-compose exec backend python manage.py migrate --fake-initial
```

#### **5. Sample Data Issues**
```bash
# Clear and recreate sample data
docker-compose exec backend python manage.py cleanup_sample_data
docker-compose exec backend python manage.py create_sample_data
```

### Useful Commands

#### **Container Management**
```bash
# View all containers
docker ps -a

# View logs
docker-compose logs <service_name>

# Restart a service
docker-compose restart <service_name>

# Execute commands in container
docker-compose exec <service_name> <command>
```

#### **Database Operations**
```bash
# Access database shell
docker-compose exec db psql -U teacherhub_user -d teacherhub

# Django shell
docker-compose exec backend python manage.py shell

# Create new migration
docker-compose exec backend python manage.py makemigrations

# Apply migrations
docker-compose exec backend python manage.py migrate
```

#### **Development Commands**
```bash
# Install new Python package
docker-compose exec backend pip install <package>

# Install new Node package
docker-compose exec frontend npm install <package>

# Run tests
docker-compose exec backend python manage.py test
docker-compose exec frontend npm test
```

---

## 📚 Additional Resources

- **Main Documentation**: `DOCKER_README.md`
- **Deployment Summary**: `DEPLOYMENT_SUMMARY.md`
- **Project Overview**: `ReadMe.md`
- **Environment Template**: `env.example`
- **Setup Script**: `setup.sh`

---

## 📞 Support

If you encounter any issues during deployment:

1. Check the troubleshooting section above
2. Review the logs: `docker-compose logs`
3. Verify all services are running: `docker ps`
4. Check the environment configuration: `cat .env`
5. Restart the setup: `./setup.sh`

The deployment process is designed to be foolproof, but if you encounter issues, the automated setup script will guide you through the resolution process. 