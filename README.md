# Password Strength Analyzer Security Suite

A professional, full-stack cybersecurity-focused Password Strength Analyzer built with **React, Express, TypeScript, and MySQL**. The application evaluates password strength using entropy analysis, NIST-inspired security rules, password history comparison, secure password generation, and cryptographic hashing to help users create stronger passwords and prevent password reuse.

---

# Features

## Advanced Password Strength Analysis
- Real-time password strength scoring (0–100)
- Shannon Entropy calculation
- Crack time estimation
- Strength classification:
  - Very Weak
  - Weak
  - Fair
  - Strong
  - Very Strong

---

## 🛡️ Security Validation

The analyzer checks for:

- Minimum password length
- Uppercase letters
- Lowercase letters
- Numbers
- Special characters
- Common dictionary passwords
- Password reuse
- Entropy level
- Overall security score

---

## Secure Password Generator

Uses Node.js cryptographically secure random generation instead of predictable random functions.

Features:

- Secure random passwords
- Configurable complexity
- High entropy generation
- Copy-to-clipboard support

---

## Password History Protection

Passwords are **never stored in plain text**.

The application stores only **bcrypt hashes** inside the MySQL database.

When a user enters a password:

1. The password is hashed.
2. Previous hashes are retrieved.
3. bcrypt.compare() securely checks for reuse.
4. Plain passwords are never exposed.

---

##  MySQL Database

The application now uses **MySQL** for persistent storage.

Tables include:

### Users

| Column | Type |
|---------|------|
| id | INT |
| username | VARCHAR |
| email | VARCHAR |
| created_at | TIMESTAMP |

---

### PasswordHistory

| Column | Type |
|---------|------|
| id | INT |
| user_id | INT |
| password_hash | VARCHAR |
| password_strength | VARCHAR |
| entropy | DECIMAL |
| crack_time | VARCHAR |
| created_at | TIMESTAMP |

---

### SecurityReports

| Column | Type |
|---------|------|
| id | INT |
| user_id | INT |
| score | INT |
| entropy | DECIMAL |
| feedback | TEXT |
| created_at | TIMESTAMP |

---

# 🛠️ Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Express.js
- TypeScript
- bcrypt
- Helmet
- CORS
- dotenv

### Database

- MySQL
- mysql2

---

# 📂 Project Structure

```text
Password-Strength-Analyzer/

├── assets/
├── server/
│   ├── config/
│   │      db.js
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   └── utils/
│
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── database.sql
├── server.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

#  Security Features

- bcrypt password hashing
- SQL Injection protection using prepared statements
- Secure HTTP headers via Helmet
- CORS protection
- Password entropy calculation
- Password reuse detection
- NIST-inspired password validation
- Secure password generation

---

# ⚙️ Installation

## 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/password-strength-analyzer.git

cd password-strength-analyzer
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root.

Example:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_DATABASE=password_analyzer
```

For Railway:

```env
MYSQL_HOST=<Railway MYSQLHOST>
MYSQL_PORT=<Railway MYSQLPORT>
MYSQL_USER=<Railway MYSQLUSER>
MYSQL_PASSWORD=<Railway MYSQLPASSWORD>
MYSQL_DATABASE=<Railway MYSQLDATABASE>
```

---

## 4. Create the Database

Run:

```sql
database.sql
```

This creates all required tables automatically.

---

## 5. Start Development Server

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## 6. Build for Production

```bash
npm run build
```

Run:

```bash
npm start
```

---

# 📈 Future Enhancements

- Have I Been Pwned API integration
- Password breach monitoring
- User authentication
- Password expiration reminders
- Security dashboard
- Password export history
- Argon2id support
- Multi-user accounts
- Two-factor authentication

---

# License

Apache 2.0 License

---

# Author

**Supriya Singh**

Built as a cybersecurity-focused full-stack project demonstrating secure password analysis, cryptographic hashing, secure storage using MySQL, and modern web application security best practices.
