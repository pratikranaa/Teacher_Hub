#!/bin/bash

# Teacher Hub - One-Click Setup Script
# This script sets up the entire Teacher Hub application using Docker

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        echo ""
        echo "🐳 Docker Installation Guide:"
        echo ""
        case "$(uname -s)" in
            Darwin*)
                echo "macOS:"
                echo "  1. Download Docker Desktop: https://docs.docker.com/desktop/install/mac-install/"
                echo "  2. Or install via Homebrew: brew install --cask docker"
                ;;
            Linux*)
                echo "Linux:"
                echo "  1. Docker Desktop: https://docs.docker.com/desktop/install/linux-install/"
                echo "  2. Or Docker Engine:"
                echo "     Ubuntu/Debian: sudo apt install docker.io docker-compose"
                echo "     CentOS/RHEL: sudo yum install docker docker-compose"
                echo "     Fedora: sudo dnf install docker docker-compose"
                ;;
            CYGWIN*|MINGW32*|MSYS*|MINGW*)
                echo "Windows:"
                echo "  1. Download Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
                echo "  2. Or install via Chocolatey: choco install docker-desktop"
                ;;
        esac
        echo ""
        echo "📖 For complete installation guide, see: DOCKER_README.md"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo ""
        echo "🔧 Docker Compose Installation:"
        echo "  - Docker Desktop includes Docker Compose"
        echo "  - For standalone installation: https://docs.docker.com/compose/install/"
        echo "  - Linux: sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
        echo "  - Then: sudo chmod +x /usr/local/bin/docker-compose"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        echo ""
        echo "🚀 Start Docker:"
        case "$(uname -s)" in
            Darwin*)
                echo "  macOS: Open Docker Desktop from Applications"
                echo "  Or run: open -a Docker"
                ;;
            Linux*)
                echo "  Linux: sudo systemctl start docker"
                echo "  Enable on boot: sudo systemctl enable docker"
                ;;
            CYGWIN*|MINGW32*|MSYS*|MINGW*)
                echo "  Windows: Start Docker Desktop from Start Menu"
                ;;
        esac
        exit 1
    fi
    
    print_success "All requirements satisfied!"
}

# Function to setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        if [ -f env.example ]; then
            cp env.example .env
            print_success "Created .env file from env.example"
        else
            print_error "env.example file not found!"
            exit 1
        fi
    else
        print_warning ".env file already exists. Skipping creation."
    fi
    
    # Prompt for email configuration
    echo ""
    print_status "Email configuration is required for the application to work properly."
    echo "You can configure Gmail SMTP or skip for now (can be configured later)."
    echo ""
    
    read -p "Do you want to configure email settings now? (y/n): " configure_email
    
    if [[ $configure_email == "y" || $configure_email == "Y" ]]; then
        read -p "Enter your Gmail address: " email_user
        read -s -p "Enter your Gmail App Password: " email_password
        echo ""
        
        # Update .env file
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/EMAIL_HOST_USER=.*/EMAIL_HOST_USER=$email_user/" .env
            sed -i '' "s/EMAIL_HOST_PASSWORD=.*/EMAIL_HOST_PASSWORD=$email_password/" .env
        else
            # Linux
            sed -i "s/EMAIL_HOST_USER=.*/EMAIL_HOST_USER=$email_user/" .env
            sed -i "s/EMAIL_HOST_PASSWORD=.*/EMAIL_HOST_PASSWORD=$email_password/" .env
        fi
        
        print_success "Email configuration updated!"
    else
        print_warning "Email configuration skipped. You can configure it later in the .env file."
    fi
}

# Function to clean up previous installations
cleanup_previous() {
    print_status "Cleaning up previous installations..."
    
    # Stop and remove containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Remove unused images (optional)
    read -p "Do you want to remove unused Docker images to free up space? (y/n): " cleanup_images
    if [[ $cleanup_images == "y" || $cleanup_images == "Y" ]]; then
        docker image prune -f
        print_success "Unused images removed!"
    fi
}

# Function to build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Build images
    print_status "Building Docker images (this may take a few minutes)..."
    docker-compose build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Services started successfully!"
    else
        print_error "Some services failed to start. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Function to run database migrations and setup
setup_database() {
    print_status "Setting up database..."
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    print_status "Running database migrations..."
    docker-compose exec backend python manage.py migrate
    
    # Create superuser automatically
    echo ""
    print_status "Creating superuser account..."
    docker-compose exec backend python manage.py shell -c "
from accounts.models import User
if not User.objects.filter(email='admin@teacherhub.com').exists():
    user = User.objects.create_superuser(
        username='admin',
        email='admin@teacherhub.com',
        password='admin123',
        user_type='SCHOOL_ADMIN'
    )
    print('✅ Superuser created successfully!')
    print('Email: admin@teacherhub.com')
    print('Username: admin')
    print('Password: admin123')
    print('Access: http://localhost:8000/admin')
else:
    print('⚠️  Superuser already exists')
    print('Email: admin@teacherhub.com')
    print('Username: admin')
    print('Password: admin123')
    print('Access: http://localhost:8000/admin')
"
    
    print_success "Database setup completed!"
}

# Function to show application URLs and information
show_info() {
    echo ""
    echo "======================================"
    print_success "Teacher Hub Setup Complete!"
    echo "======================================"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   Admin Panel: http://localhost:8000/admin"
    echo "   API Documentation: http://localhost:8000/api/v1"
    echo ""
    echo "👤 Admin Account:"
    echo "   Email: admin@teacherhub.com"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo ""
    echo "🧪 Test Accounts:"
    echo "   School Admin: admin1@school.edu / admin123"
    echo "   Internal Teacher: teacher1@school.edu / teacher123"
    echo "   External Teacher: external1@teacher.com / substitute123"
    echo ""
    echo "📊 Services Status:"
    docker-compose ps
    echo ""
    echo "📝 Useful Commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop services: docker-compose down"
    echo "   Restart services: docker-compose restart"
    echo "   View running containers: docker-compose ps"
    echo ""
    echo "🔧 Configuration:"
    echo "   Environment variables: .env file"
    echo "   Email settings can be configured in .env file"
    echo ""
    echo "📚 Documentation:"
    echo "   Check DOCKER_README.md for detailed information"
    echo ""
    print_success "Setup completed successfully! 🎉"
}

# Function to handle errors
handle_error() {
    print_error "Setup failed! Check the logs above for details."
    echo ""
    echo "Common solutions:"
    echo "1. Make sure Docker is running"
    echo "2. Check if ports 3000, 8000, 5432, 6379 are available"
    echo "3. Try running: docker-compose down && docker-compose up --build"
    echo "4. Check logs: docker-compose logs"
    echo ""
    echo "For support, check the documentation or contact the development team."
    exit 1
}

# Main execution
main() {
    echo ""
    echo "🚀 Teacher Hub - One-Click Setup"
    echo "================================="
    echo ""
    
    # Trap errors
    trap handle_error ERR
    
    # Run setup steps
    check_requirements
    setup_environment
    cleanup_previous
    start_services
    setup_database
    show_info
}

# Run main function
main "$@" 