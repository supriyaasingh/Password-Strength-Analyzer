# Password Strength Analyzer Security Suite

A professional, full-stack cybersecurity-focused Password Strength Analyzer. This application calculates the complexity, Shannon entropy, and vulnerability of passwords, checks them against NIST standards and dictionary lists, performs secure cryptographic generation, and checks password history hashes in real-time to prevent credential reuse attacks.

---

## 🚀 Key Features

* **Advanced Scoring & Classification**: Custom real-time algorithm that scores passwords from 0 to 100 based on length, entropy, and character diversity, categorizing them from "Very Weak" to "Very Strong" with corresponding animated color states.
* **NIST SP 800-63B Compliance Checklist**: Real-time checklist validating length, uppercase, lowercase, numbers, special characters, dictionary commonality, and reuse.
* **Cryptographically Secure Password Generator**: Utilizes Node.js's secure `crypto.randomBytes()` rather than predictable `Math.random()` to generate safe 16-character keys.
* **Secure History Hashing & Reuse Detection**: Back-end bcrypt compare cycle detects reused keys without exposing raw plain passwords or database hash hashes to the browser.
* **Adaptive Storage & Connection Resiliency**: Detects MongoDB connections seamlessly. If offline or no credentials are supplied, it falls back to a secure file-based storage database, ensuring immediate operation out-of-the-box.
* **Interactive UX & Handbooks**: Integrated dark/light modes, custom toast notification engine, responsive copy-to-clipboard elements, and a dedicated cryptographic education handbook.

---

## 🛠️ Architecture & Folder Structure

```text
Password-Strength-Analyzer/
│
├── client/                     # Transpiled Client SPA Assets (Vite Outdir)
│
├── server/                     # Backend Security Logic
│   ├── config/
│   │      db.ts                # Database connection router (MongoDB / JSON)
│   ├── controllers/
│   │      passwordController.ts # Security REST API controller handlers
│   ├── models/
│   │      PasswordHistory.ts   # Database schemas & mongoose/file-based fallback
│   ├── routes/
│   │      password.ts          # API Endpoint routes
│   └── utils/
│          commonPasswords.ts   # Pattern filters & keyboard sequence checks
│          passwordScore.ts     # Core scoring algorithm
│          passwordGenerator.ts # Secure crypto random bytes builder
│
├── src/                        # Client-side React Application
│   ├── App.tsx                 # Core UI, state machines, and handbook pages
│   ├── index.css               # Google fonts, custom tailwind configurations
│   └── main.tsx                # Client app boots mount
│
├── server.ts                   # Unified Full-Stack Express Server Entry point
├── package.json                # Project configurations & dependencies
└── README.md                   # Technical documentation
```

---

## 🏗️ Technical Deep-Dives

### 🛡️ 1. How bcrypt Works

Raw passwords must never be stored plain-text in any database. If a database is leaked, hackers can immediately steal every user's credentials.

To prevent this, the Password Strength Analyzer uses the industrial standard **bcrypt** algorithm:
1. **Salting**: For every password, bcrypt automatically generates a unique random string (the *salt*) and appends it to the password. This prevents **Rainbow Table** attacks (precomputed tables of common password hashes) and guarantees that two users with the identical password will have totally different hash values stored in the database.
2. **Hashing**: The salted password is run through a slow cryptographic hashing function.
3. **Adaptive Work Factor (Salt Rounds)**: bcrypt is intentionally designed to be computationally expensive. We configure `saltRounds = 12`. This means the hashing function runs $2^{12} = 4096$ iterations. This takes roughly 200–300 milliseconds per password, which is unnoticeable for a logging user, but makes guessing millions of passwords via brute-force hardware completely impossible for hackers.

### 🔄 2. How Password Reuse Detection Works

To protect against **credential stuffing attacks** (reusing a password that was previously leaked in an unrelated breach), the backend restricts the reuse of older keys.

Since bcrypt hashes are salted and randomized, we cannot simply execute a database search like `db.collection.find({ passwordHash: currentPassword })` because the hashes will not match.

To implement reuse detection securely:
1. The user types a password, which is transmitted securely over an encrypted HTTPS payload to `/api/password/check`.
2. The server queries the history collection (`password_history`), pulling down existing password hashes.
3. The server runs a secure looping match:
   ```typescript
   for (const record of history) {
     const match = await bcrypt.compare(password, record.passwordHash);
     if (match) return true; // Reused!
   }
   ```
4. This comparison occurs completely server-side. **At no point are stored hashes or decrypted plain passwords sent to the client browser**, ensuring zero risk of leakage.

---

## 💻 Installation & Setup

### Prerequisites
* Node.js (v18 or higher recommended)
* Optional: A running MongoDB instance (or Atlas account)

### Step 1: Install Dependencies
Run the package installation to fetch Express, Tailwind CSS, Mongoose, and bcrypt:
```bash
npm install
```

### Step 2: Configure Environment (.env)
Create a `.env` file in the root directory (based on `.env.example`):
```env
# Optional MongoDB Connection URI. If omitted, local JSON fallback is engaged automatically!
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/password_analyzer"
```

### Step 3: Run Development Server
Boot up the full-stack server using the `tsx` compiler. Both frontend assets (via Vite middleware) and backend REST API will be served on port `3000`:
```bash
npm run dev
```
Open your browser to `http://localhost:3000` to interact with the application.

### Step 4: Build for Production
To bundle the frontend assets and compile the server TypeScript code into a single, optimized node bundle:
```bash
npm run build
```
To launch the production server:
```bash
npm start
```

---

## 🔮 Future Improvements

1. **Have I Been Pwned API Integration**: Integrate K-Anonymity requests to the *Have I Been Pwned* API to check if the password has been leaked in a public global database breach.
2. **Multi-user History Isolation**: Wire up real authentication so that history checks are isolated to the active logged-in user rather than the global analyzer sandbox.
3. **Hardware-bound Key Derivation**: Support Argon2id for password hashing, which adds memory hardness on top of CPU work factors.
