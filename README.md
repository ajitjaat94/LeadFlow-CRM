# LeadFlow CRM

LeadFlow CRM is a full-stack MERN application for managing business leads in a simple, organized way.

I built this to improve my backend skills and get closer to building a real-world product — focused on solid authentication, clean REST APIs, and a lead management system that's actually usable.

**Live Demo:** https://crm.ajitonix.com

---

## Features

- User authentication (login & signup)
- JWT-based authentication with password encryption
- Protected routes
- Dashboard overview
- Create, update, and delete leads
- Search leads
- Export leads to CSV
- Responsive UI
- Clean REST API structure
- Error handling & input validation

---

## Tech Stack

**Frontend**
- React.js
- React Router
- Tailwind CSS
- Axios

**Backend**
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Bcrypt

---

## Project Structure

```
LeadFlow-CRM/
├── client/    # React frontend
└── server/    # Express backend
```

The frontend and backend are kept separate to make the codebase easier to maintain and scale.

---

## What I Learned

Building this project helped me get hands-on with:

- JWT authentication and password security
- Backend architecture and REST API design
- MongoDB & Mongoose (schema design, queries)
- CRUD operations end-to-end
- State management on the frontend
- Building reusable React components
- Proper error handling across the stack

---

## Installation

**1. Clone the repository**
```bash
git clone https://github.com/ajitjaat94/LeadFlow-CRM.git
cd LeadFlow-CRM
```

**2. Install dependencies**
```bash
cd server
npm install

cd ../client
npm install
```

**3. Set up environment variables**

Create `.env` files from the provided examples:
```bash
cd server
copy .env.example .env

cd ../client
copy .env.example .env
```
> On macOS/Linux, use `cp` instead of `copy`.

Then update the values in each `.env` file as needed.

**4. Run the project locally**

In one terminal, start the backend:
```bash
cd server
npm run dev
```

In a second terminal, start the frontend:
```bash
cd client
npm run dev
```

---

## Future Improvements

- Team management
- Role-based access control
- Activity history / audit log
- Analytics dashboard
- Notes for leads
- Follow-up reminders
- File attachments

---

## About This Project

This is one of my portfolio projects, built to demonstrate practical full-stack development skills. I plan to keep improving it as I learn new tools and best practices.

---

## Author

**Ajit Bijarniya**
Full Stack Developer
🌐 https://ajitonix.com

---

If you found this project useful, consider leaving a ⭐ on the repo!
