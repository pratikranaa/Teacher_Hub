# Team - STATUS-200
Team Members: Pratik Rana, Manan Chawla, Krishna Sharma, Sudershan Singh Negi, Rahul Kumar


# Substitute Teacher Management System

A comprehensive web application for managing substitute teacher requests and assignments in educational institutions.

## Overview

This system streamlines the process of managing substitute teacher requests, assignments and scheduling for schools. It allows school administrators and teachers to easily submit substitute requests, while helping substitutes find and accept teaching opportunities.

## Features

- **User Management**
  - Multiple user roles (School Admin, Internal Teacher, Substitute Teacher)
  - Secure authentication and authorization
  - Profile management for all users

- **Substitute Request Management**
  - Create substitute teaching requests
  - Specify subject, grade level, date and time requirements
  - Add special instructions and requirements
  - Set priority levels for urgent requests
  - Track request status

- **Assignment Management**  
  - Match qualified substitutes to requests
  - Accept/decline teaching assignments
  - View upcoming assignments
  - Track assignment history
  - Rate and review completed assignments

- **School Management**
  - Register and manage school information
  - Set school-specific requirements
  - View substitute availability
  - Generate reports and analytics

## Technology Stack

- **Backend**: Python/Django REST Framework
- **Frontend**: React.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)

## Installation


1. Set up Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
cd frontend
npm install
```

3. Configure environment variables:
- Copy `.env.example` to `.env`
- Update database and other configuration settings

4. Run database migrations:
```bash
python manage.py migrate
```

5. Start development servers:
```bash
# Backend
python manage.py runserver

# Frontend (in a new terminal)
cd frontend
npm start
```
