# PetCare Pro — Veterinary Clinic Management System

PetCare Pro is a web-based veterinary clinic management application for organizing clinic operations, including pet and owner records, appointments, medical records, prescriptions, vaccinations, surgery, laboratory workflows, pharmacy, inventory, boarding, grooming, billing, staff management, and reporting.

The application uses **Vetnora Animal Hospital** as sample clinic branding. Replace the sample details with your own clinic information before using the application in production.

> **Note:** Available features depend on the modules included in the supplied version. This README documents the installation and first-time setup workflow for the package.

## 1. Technology Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT-based authentication

## 2. Requirements

Before installing, ensure you have:

- Node.js compatible with the dependencies in `package.json` (Node.js 20 LTS is a sensible starting point, but use a version supported by the supplied project).
- npm
- A MongoDB database, either local or hosted.
- A modern web browser.

Check the installed versions:

```bash
node --version
npm --version
```

## 3. Project Structure

The package includes the following main directories and files:

- `app/` — Next.js frontend pages, layouts, and components.
- `server/` — Express API, routes, controllers, middleware, models, and database configuration.
- `netlify/` — Netlify function integration.
- `public/` — Static frontend assets.
- `next.config.js` — Next.js configuration.
- `tailwind.config.ts` — Tailwind CSS configuration.
- `postcss.config.js` — PostCSS configuration.
- `package.json` — Dependencies and npm scripts.
- `package-lock.json` — Locked npm dependency versions.
- `.env.example` — Example environment configuration.
- `petcare-documentation/` — Product guide and screenshots.

## 4. Installation

### Step 1: Extract the package

1. Download the PetCare Pro ZIP package.
2. Extract it to a folder on your computer or server.
3. Open the extracted project folder in a terminal or code editor.
4. Make sure the terminal is in the project root, where `package.json` is located.

### Step 2: Install dependencies

Run:

```bash
npm ci
```

This installs the dependencies recorded in `package-lock.json`.

If `npm ci` fails because the lockfile is missing or intentionally out of sync, review the error first. If appropriate for your installation, run:

```bash
npm install
```

## 5. Configure Environment Variables

Create a local `.env` file in the project root using `.env.example` as a reference. Do not commit or distribute your real `.env` file.

Example values:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=petcare_pro
JWT_SECRET=replace-with-a-unique-random-secret-of-at-least-32-characters
API_PORT=3001
```

The example above must match the variables used by the supplied version. If `.env.example` contains additional required variables, configure those as well.

- `MONGODB_URI` — MongoDB connection string.
- `MONGODB_DB` — Database name, if the application reads it separately.
- `JWT_SECRET` — Private secret used to sign and verify authentication tokens.
- `API_PORT` — Port used by the Express API.

If the frontend requires an API base URL or the application requires email settings, configure those variables using the exact names documented in `.env.example`.

Generate a random JWT secret using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copy the generated value into your local environment file and keep it private. Never include production credentials, private API keys, database passwords, or real secrets in the distributed ZIP.

## 6. Configure MongoDB

PetCare Pro requires a MongoDB database.

### Option A: MongoDB Atlas

1. Create a MongoDB Atlas account and database deployment.
2. Create a database user with an appropriate password.
3. Configure network access to allow connections from your application server.
4. Copy the MongoDB connection string.
5. Set the connection string in `MONGODB_URI`.
6. Set `MONGODB_DB` to the database name if the application supports a separate database-name variable.
7. Save the environment configuration.

Use suitable database permissions and restrict network access. Avoid leaving the database publicly accessible to all IP addresses.

### Option B: Local MongoDB

1. Install MongoDB Community Server.
2. Start the MongoDB service.
3. Confirm that MongoDB is running.
4. Configure `MONGODB_URI` for your local instance.
5. Set the intended database name.

Example:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=petcare_pro
```

The API uses the database configuration provided in the environment. Collections and records are created according to the application's Mongoose models and database operations.

## 7. Start the Application Locally

The frontend and Express API run as separate processes during local development. Open two terminal windows in the project root.

### Terminal 1: Start the API

```bash
npm run server
```

The API defaults to port `3001` when no other port is configured.

Wait for the API to start and confirm that the database connection succeeds.

### Terminal 2: Start the frontend

```bash
npm run dev
```

Open the local URL shown by Next.js, typically:

`http://localhost:3000`

If the configured development setup proxies `/api/*` requests to the local Express API, the frontend can use that proxy. If the project is configured differently, follow its included environment example and deployment configuration.

## 8. First-Time Setup and Clinic Owner Registration

PetCare Pro includes a signup page for creating an initial `Clinic Owner` account.

### Step 1: Open the signup page

After the API and frontend are running, visit:

`http://localhost:3000/signup`

If Next.js is running on a different port, use the URL printed in the terminal.

### Step 2: Complete the registration form

Enter the following details:

**Required fields**
- Full name
- Email address
- Password
- Confirm password
- Clinic name
- First branch name
- Acceptance of the displayed terms

**Optional fields**
- Phone number
- Clinic address

Use an email address you control and a strong, unique password. Follow any password rules shown by the application. Submit the form and wait for the registration result.

The registration flow is intended to create a `Clinic Owner` account. The password should be stored as a bcrypt hash, not as plain text.

### Step 3: Sign in

If registration does not redirect you automatically, open:

`http://localhost:3000/login`

Sign in using the email address and password you registered with.

### Step 4: Configure your clinic

After signing in:

1. Replace the sample clinic name and contact details.
2. Configure available clinic and branch settings.
3. Add staff accounts through the application's supported staff-management workflow.
4. Configure roles and permissions as needed.
5. Create the initial pet-owner, pet, appointment, and other records required for your clinic.

**Security note:** The initial registration endpoint creates a `Clinic Owner` account. Before exposing the application publicly, verify that registration is appropriately restricted after the first clinic owner has been created. Do not allow an unauthenticated public endpoint to grant arbitrary users Super Admin privileges.

## 9. Demo Accounts and Database Records

The seller's hosted demo website uses its own configured database. Its demo accounts, pet records, appointments, and other records are not automatically copied into a buyer's database.

For a fresh installation, register your own Clinic Owner account and create the records needed for your clinic. If a sanitized seed script or sample-data import is included with your package, follow its accompanying instructions. Do not assume that a seed script or database dump is included unless it is present in the package.

Never distribute or import a live database dump containing private customer details, staff credentials, pet-owner information, or medical records.

## 10. Basic Usage

The application is designed to centralize veterinary clinic workflows. Depending on the modules included in your version, typical tasks may include:

- **Dashboard:** Review available clinic overview information.
- **Pets and owners:** Create and maintain pet profiles and owner information.
- **Appointments:** Schedule and manage clinic appointments.
- **Medical records:** Maintain clinical history and treatment information.
- **Prescriptions and vaccinations:** Record relevant treatment and vaccination information.
- **Surgery and laboratory:** Manage supported surgery and laboratory workflows.
- **Pharmacy and inventory:** Maintain stock and pharmacy records.
- **Boarding and grooming:** Manage these workflows if included.
- **Billing:** Create and manage billing and payment records.
- **Staff and reports:** Manage staff access and review available reports.

Available features and permissions depend on the supplied application version and the signed-in user's role.

## 11. Production Build and Start

Configure production environment variables before building or deploying the application.

Build the Next.js frontend:

```bash
npm run build
```

For a standard Next.js production server, start the built frontend using:

```bash
npm start
```

The Express API must also be deployed and started separately if required by the application's architecture. Use the actual scripts and hosting configuration included with the supplied package.

Do not use `npm run dev` as the production start command. A successful frontend build does not by itself confirm that API requests, authentication, and database operations work correctly.

## 12. Netlify Deployment

If you deploy using the included Netlify integration, configure the required environment variables in the Netlify project settings. Depending on the integration, these may include:

- `JWT_SECRET`
- `MONGODB_URI`
- `MONGODB_DB`

Use the exact variables required by the included Netlify function. Netlify functions do not automatically read a local `.env` file. Add variables through the deployment settings and redeploy after changing them.

Verify that the frontend, API routes, authentication, and database connection work in the deployed environment. Deploying the Next.js frontend alone does not necessarily start a separate Express API.

## 13. Health Check and Troubleshooting

If the included API exposes the following health endpoint, it can be used to check API availability:

```text
GET /api/health
```

Use the endpoint only if it is present in the supplied API routes. A successful health response does not guarantee that login or all database operations work.

### MongoDB connection fails

- Check `MONGODB_URI` and `MONGODB_DB`.
- Confirm that MongoDB is running or reachable.
- Check database credentials and permissions.
- Review network access and IP allowlisting.

### Login fails

- Confirm that the account exists in the database used by the running API.
- Check the email address and password.
- Confirm that the account is active.
- Review server logs and role/authorization configuration.

### Frontend cannot reach the API

- Confirm that the frontend and API are running.
- Check the API base URL and port.
- Review proxy, routing, and deployment configuration.
- Check browser developer tools and server logs.

### New database has no demo records

The seller's hosted demo database is separate from the buyer's database. Register your own account and create the necessary records, or use a documented sample-data process if one is included.

### Build fails

- Confirm that the installed Node.js version is supported.
- Ensure dependency installation completed successfully.
- Review the full output from `npm ci` and `npm run build`.
- Check required environment variables and configuration.

## 14. Security Recommendations

Before using PetCare Pro with real clinic data:

- Use a unique JWT secret in each environment.
- Keep `.env` files and database credentials private.
- Use HTTPS in production.
- Restrict database network access.
- Assign staff only the permissions they require.
- Back up the database regularly.
- Keep dependencies updated.
- Use synthetic or anonymized data for demonstrations.
- Review authentication, password reset, and authorization flows before deployment.

Veterinary clinic records may contain sensitive information. Deploy and maintain the application with appropriate security controls.

## 15. Customization and Clinic Branding

The application uses Vetnora Animal Hospital as sample clinic branding. Replace the sample clinic name, logo, contact details, and other settings with your own information before deploying publicly.

Use the application's settings interface where available. If any branding is configured in source files or environment variables, update the relevant configuration and rebuild or redeploy as needed.

Changing the displayed clinic name may not automatically change every metadata field, URL, or deployment setting.

## 16. License and Third-Party Notices

Review the included license and third-party notices before modifying or redistributing the software. Third-party packages, fonts, icons, images, and other assets may have separate licensing requirements. Comply with the applicable terms and include required notices.

## 17. Additional Documentation

See the `petcare-documentation/` folder included in the package for the product guide and selected screenshots.

## 18. Final Setup Checklist

Before using the application, confirm that:

- [ ] Dependencies install successfully.
- [ ] Environment variables are configured.
- [ ] MongoDB is reachable.
- [ ] The API starts successfully.
- [ ] The frontend starts successfully.
- [ ] The signup page can create the initial Clinic Owner account.
- [ ] The new account can sign in.
- [ ] Clinic settings can be configured.
- [ ] Required initial records can be created.
- [ ] Core workflows work as expected.
- [ ] The production build succeeds.
- [ ] Production credentials are not included in the distributed ZIP.
