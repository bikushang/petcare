# PetCare Pro - Veterinary Clinic Management System

PetCare Pro is a full-stack veterinary practice management application for organizing clinic workflows such as pet and owner records, appointments, medical records, prescriptions, vaccinations, surgery, laboratory tests, pharmacy, inventory, boarding, grooming, billing, staff, and reporting.

## Technology stack

- Next.js 14 and React 18
- TypeScript and Tailwind CSS
- Node.js and Express API
- MongoDB with Mongoose
- JWT-based authentication

## Requirements

- Node.js compatible with the dependencies in `package.json` (Node.js 20 LTS is a sensible starting point)
- npm
- A MongoDB database, either local or hosted
- A modern browser

## Project structure

- `app/` — Next.js frontend and application pages
- `server/` — Express API, routes, controllers, middleware, models, and MongoDB connection
- `netlify/` — Netlify function integration
- `public/` — static frontend assets
- `next.config.js` — Next.js configuration
- `tailwind.config.ts` and `postcss.config.js` — styling configuration
- `package.json` and `package-lock.json` — dependencies and npm scripts

## 1. Install dependencies

Extract the project ZIP, open a terminal in the project root (the directory containing `package.json`), and run:

```bash
npm ci
```

If `npm ci` cannot be used because the lockfile has changed, run `npm install` instead.

## 2. Configure environment variables

Create a `.env` file in the project root. Do not commit or distribute real credentials. Use `.env.example` as a reference.

```dotenv
# MongoDB connection string for the database this installation should use
MONGODB_URI=mongodb://127.0.0.1:27017

# Database name (optional; defaults to petcare_pro in server/config/db.js)
MONGODB_DB=petcare_pro

# Required: use a unique, random, private value with at least 32 characters.
JWT_SECRET=replace-with-a-long-random-secret

# Express API port (optional; defaults to 3001)
API_PORT=3001

# Optional: set only if the frontend needs a non-default API base URL.
# NEXT_PUBLIC_API_BASE_URL=
```

### MongoDB setup

1. Install MongoDB locally or create a database with a MongoDB hosting provider.
2. Copy the connection string into `MONGODB_URI`. For a hosted database, use the provider's connection string and ensure the database user has appropriate permissions and the server's IP/network access is configured.
3. Set `MONGODB_DB` to the database name you intend to use.
4. Keep the connection string and database credentials private. Do not put MongoDB credentials in client-side `NEXT_PUBLIC_*` variables.
5. Start the API and confirm that the terminal reports a successful database connection.

The API reads `MONGODB_URI` and `MONGODB_DB` in `server/config/db.js`. If `MONGODB_DB` is omitted, it uses `petcare_pro`.

## 3. Start the application locally

The frontend and Express API run as separate processes during local development. Open two terminals in the project root.

**Terminal 1 — API server:**

```bash
npm run server
```

The API defaults to `http://localhost:3001`.

**Terminal 2 — Next.js frontend:**

```bash
npm run dev
```

Open the local URL printed by Next.js, usually `http://localhost:3000`.

The development configuration proxies `/api/*` requests to the local Express API.

## 4. Production build

Build the Next.js frontend:

```bash
npm run build
```

Start the frontend with:

```bash
npm run start
```

The Express API must also be deployed and started separately using the configured environment variables. A production deployment must route API requests to the Express API or use the included Netlify integration correctly. Do not assume that deploying only the Next.js frontend will also start the Express server.

## 5. Database contents and demo accounts

This package does **not** run a database seeder automatically. The demo records and demo accounts currently visible on the hosted demonstration website are stored in that website's configured database; they are not automatically copied into a buyer's separate MongoDB database by installing this ZIP.

For a fresh installation, configure the database and create/import the required application records and staff accounts using an authorized database setup process. Use password hashes compatible with the application's authentication implementation; do not store plain-text passwords. Confirm that the relevant staff records exist and that their accounts are active before attempting to sign in.

If you provide demo credentials for the public demo, list them separately in the product documentation only after verifying they work. Do not assume those credentials will work against a buyer's database. Do not distribute a live production database dump containing real customer, owner, pet, staff, or other private data. If you want buyers to have sample data, prepare a sanitized sample database backup or a documented, safe initialization/import process.

## 6. Health check and troubleshooting

The Express API exposes a health endpoint:

```text
GET /api/health
```

Expected response includes `status: "ok"` when the API is reachable. This endpoint alone does not prove that login or all database operations work.

- **MongoDB connection error:** Check `MONGODB_URI`, database permissions, network/IP allowlisting, and whether MongoDB is running.
- **Login fails:** Confirm the staff account exists in the configured database, the password is correct, the password is stored as a compatible hash, and the account is not inactive or suspended.
- **Frontend cannot reach the API:** Confirm both processes are running locally and that the production host routes `/api` requests to the Express API.
- **Missing data on a new installation:** The hosted demo database is separate from the buyer's database. Import/create sample records for the new installation.
- **Build issues:** Check the Node.js version and review the complete output from `npm ci` and `npm run build`.

## 7. Security and deployment notes

- Set a unique, strong `JWT_SECRET` of at least 32 characters in every environment. The API refuses to start without it.
- Keep `.env` out of the ZIP and source control; include only `.env.example` with placeholder values.
- Use HTTPS in production and restrict database network access.
- Use synthetic or properly anonymized data for demos and screenshots.
- Review authentication, password reset, authorization, and API access controls before deploying with real clinic data.

## 8. License and third-party packages

Review all included third-party packages, fonts, icons, images, and other assets and comply with their applicable licenses before redistribution. Include the applicable license and third-party notices with the product.

## Documentation

See the accompanying `petcare-documentation` folder for the feature guide and screenshots.
