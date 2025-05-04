# Fitness Centre Web App

This MVP uses Vue 3 + Pinia for the frontend, Express.js for the backend, and MySQL for the database.

## 📁 Project Structure
- `/frontend`: Vue 3 + Pinia app
- `/backend`: Express backend with a migration script
- `README.md`: Setup instructions

---

## ✅ Setup Instructions

### 1. Clone or unzip this project

### 2. Setup the Database

Update DB credentials in `.env.example`:

```.env.example
PORT=3000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASS=your_mysql_password
DB_NAME=fitness_centre
JWT_SECRET=your_jwt_secret
```

Then run the migration:

```bash
cd backend
cp .env.example .env
npm install
node migrate.js
```

---

### 3. Run the Backend

```bash
npm install
npm start
```

Add your Express routes in `backend`.

---

### 4. Run the Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

```example account to login
admin@example.com
admin123
```


Visit [http://localhost:5173](http://localhost:5173)
