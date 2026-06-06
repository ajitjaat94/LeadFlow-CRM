# LeadFlow CRM 

A modern Customer Relationship Management (CRM) application built to help businesses manage and organize leads efficiently. LeadFlow CRM provides a clean dashboard, lead management system, and an intuitive user experience for tracking customer interactions.

## 🌐 Live Demo

https://lead-flow-crm-tau.vercel.app/

---

## 📖 Overview

LeadFlow CRM is a full-stack lead management application built as a hackathon project. It allows users to create, view, update, and delete leads through a clean and responsive dashboard.

This project was developed to practice real-world CRUD operations, API integration, and full-stack web development.

---

## ✨ Features

### Lead Management

* Add New Leads
* View All Leads
* Edit Existing Leads
* Delete Leads
* Lead Status Tracking

### Dashboard

* Lead Overview
* Lead Statistics
* Clean and Responsive UI

### User Experience

* Mobile Responsive Design
* Fast Navigation
* Modern Interface
* Reusable Components

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Tailwind CSS
* React Router DOM
* Axios

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Deployment

* Vercel (Frontend)
* MongoDB Atlas
* Render

---

## 📂 Project Structure

```bash
src/
│
├── components/
│   ├── ui/
│   ├── Navbar.jsx
│   ├── LeadTable.jsx
│   └── LeadStructure.jsx
│
├── pages/
│   ├── Dashboard.jsx
│   └── Lead.jsx
│
├── routes/
│   └── AppRoute.jsx
│
├── services/
│
└── App.jsx
```

---

## 🔥 Core Functionality

### Create Lead

Users can add new leads with details such as:

* Name
* Company
* Email
* Phone Number
* Status
* Notes

### Read Leads

View all leads in a structured table format.

### Update Lead

Modify existing lead information using the edit feature.

### Delete Lead

Remove leads from the system instantly.

---

## 📡 API Endpoints

### Create Lead

```http
POST /api/leads
```

### Get All Leads

```http
GET /api/leads
```

### Get Single Lead

```http
GET /api/leads/:id
```

### Update Lead

```http
PUT /api/leads/:id
```

### Delete Lead

```http
DELETE /api/leads/:id
```

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/ajitjaat94/LeadFlow-CRM.git
```

### Navigate to Project

```bash
cd leadflow-crm
```

### Install Frontend Dependencies

```bash
npm install
```

### Start Frontend

```bash
npm run dev
```

### Start Backend

```bash
npm run dev
```

---

## 🎯 Learning Outcomes

This project helped in understanding:

* React Component Architecture
* React Router
* CRUD Operations
* REST APIs
* State Management
* MongoDB Integration
* Express.js Backend Development
* API Consumption with Axios
* Responsive Design with Tailwind CSS

---

## 🔮 Future Improvements

* User Authentication (Login & Signup)
* JWT Authorization
* Protected Routes
* User-Specific Leads
* Advanced Search & Filters
* Lead Analytics Dashboard
* Activity History
* Export Leads (CSV/PDF)

---

## 👨‍💻 Author

**Ajit Bijarniya**

BCA Student | Full Stack Web Developer

Passionate about building modern web applications and solving real-world problems through technology.

---

## ⭐ Support

If you like this project, consider giving it a star on GitHub.

⭐ Star this repository to support the project.
