# Project ReBond Backend

This backend provides the API for the Project ReBond website. It handles admin authentication and product management for the company website.

## Purpose

The backend allows the company/admin to:

- Log in securely
- View products
- Add new products
- Edit existing products
- Delete products
- Store product information in MongoDB Atlas

The frontend and product admin pages will connect to this backend using API endpoints.

---

## Tech Stack

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcryptjs
- dotenv
- cors
- nodemon

---

## Folder Structure

```text
backend/
│
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
├── .env.example
│
├── config/
│   └── db.js
│
├── middleware/
│   └── authMiddleware.js
│
├── models/
│   ├── admin.js
│   └── product.js
│
└── routes/
    ├── authRoutes.js
    └── productRoutes.js