# Fundflow: Multitenant Payment System

Fundflow is a robust, multitenant payment management system designed for organizations to seamlessly onboard members, track obligations, and process payments securely via Mobile Money. 

**👨‍💻 Lead Developer:** Abdul Salim Gani

---

## ✨ Core Features & Application Flow

Fundflow handles completely separated tenant environments (organizations). The platform differentiates users by `admin` and `member` roles.

### Organization Administrators
- **Dashboard & Analytics:** View real-time aggregated metrics on Monthly, Weekly, One-time, and Donation payments.
- **Payment Request Creation:** Create flexible payment tabs (e.g., "Annual Subscriptions", "Emergency Relief Fund").
- **Member Management:** Bulk import members, track active vs. suspended members, and manually approve offline payments if needed.

### Organization Members
- **Obligation Tracking:** View outstanding balances dynamically calculated by the system.
- **Seamless Payments:** Pay securely using local Mobile Money providers (Afrimoney, Orange Money) directly through the Monime integration.
- **Digital Receipts:** Access and download auto-generated PDF receipts for every completed transaction.

---

## 🚀 Tech Stack & Architecture

### Frontend (Web - Next.js)
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI & Visualization**: Custom responsive components tailored for mobile devices, [Lucide React](https://lucide.dev/) for iconography, [Recharts](https://recharts.org/) for business analytics.
- **Forms & Validation**: React Hook Form paired with Zod schemas for strict client-side validation.
- **State & Notifications**: Sonner and SweetAlert2 for user feedback.

### Backend (Supabase)
- **Database (PostgreSQL)**: Core tables include `organizations`, `users`, `members`, `payments`, `payment_tabs`, and `obligations`.
- **Row Level Security (RLS)**: Strictly enforced policies ensure members only access their own payment history, while admins only access data belonging to their specific organization ID.
- **Authentication**: Supabase Auth handling email/password and secure session management.
- **Deno Edge Functions**: Encapsulates all heavy business logic, webhooks, and third-party API communication.
- **Supabase Storage**: Secure buckets for organization logos and generated PDF receipts.

### Integrations
- **Payment Gateway**: **Monime API** (Handles Mobile Money payments in Sierra Leone and relevant regions).
- **Email Delivery**: **Resend API** (Used within edge functions to instantly deliver payment receipts and administrative notifications).

---

## 🌍 Live Deployment & Hosting

The Fundflow application is actively deployed and accessible in a production environment.

- **Production URL**: [https://fundflow.sl](https://fundflow.sl)
- **Hosting Provider**: **FastComet**
- **Deployment Interface**: **cPanel**

### Deployment Architecture & Process

The deployment of Fundflow leverages **FastComet** hosting managed via **cPanel**, offering a reliable and highly optimized environment for the Next.js frontend, while keeping the database and backend tightly secured on the Supabase cloud infrastructure.

#### 1. Frontend Web Application (Next.js)
The Next.js user interface is deployed through cPanel's native Node.js application hosting capabilities:
- **Build Generation**: The application is compiled for production utilizing the `npm run build` command to generate an optimized build footprint.
- **cPanel "Setup Node.js App"**: The native **"Setup Node.js App"** (Phusion Passenger) feature within cPanel is utilized to initialize the Next.js instance, assigning the relevant Node.js version and pointing to the proper startup script.
- **File Deployment**: The optimized `.next` build directory, configurations, and `public/` assets are transferred into the designated environment using cPanel's File Manager or secure FTP.
- **Environment Variables**: Essential configuration keys (like `NEXT_PUBLIC_BASE_URL=https://fundflow.sl`, Supabase keys, and API tokens) are securely injected directly into the cPanel Node.js application interface.
- **Routing & SSL**: cPanel securely manages the reverse proxy infrastructure, mapping external web traffic from `fundflow.sl` to the internal Next.js application port, and enforcing strict TLS encryption via Let's Encrypt.

#### 2. Backend Infrastructure (Supabase)
To ensure maximum scalability and security, the data layer and intensive backend logic are intentionally disconnected from cPanel and operate natively on the Supabase platform:
- **Core Database & Auth**: Cloud-managed PostgreSQL and secure user authentication are handled by the Supabase project.
- **Serverless Edge Logic**: Intensive routines like the `monime-webhook` listener and PDF receipt generation run globally as Supabase Edge Functions.

### Step-by-Step Deployment Guide (FastComet + cPanel)

Follow these instructions to deploy a new version of the Next.js application to FastComet:

#### 1. Prepare the Production Build Locally
1. Navigate to the `web/` directory in your local terminal.
2. Run `npm install` to ensure all dependencies are up-to-date.
3. Run `npm run build` to compile the production application.
4. Compress the following items into a `.zip` archive:
   - `.next` folder
   - `public` folder
   - `package.json`
   - `package-lock.json`
   - *(Note: A custom `server.js` might be required if utilizing a custom Passenger startup script)*.

#### 2. Upload Files via cPanel
1. Log in to your FastComet Client Area and open **cPanel**.
2. Navigate to **Files** > **File Manager** and open the application's root directory (e.g., `public_html` or the custom addon domain directory).
3. **Upload** your compressed `.zip` archive into this directory.
4. Right-click the uploaded `.zip` and select **Extract**. *(Ensure you do not accidentally overwrite any production environment variables you might have stored in a local `.env` on the server).*

#### 3. Setup or Update the Node.js App
1. In cPanel, navigate to the **Software** section and click **Setup Node.js App**.
2. If this is a **new deployment**, click **Create Application**:
   - **Node.js version**: Select `18.x` or higher.
   - **Application mode**: `Production`.
   - **Application root**: Enter the folder path containing your extracted files.
   - **Application URL**: Select your domain (`fundflow.sl`).
   - **Startup File**: Point this to your server startup script (e.g., `server.js` or standard Next.js boot script).
3. Under **Environment variables**, click **Add Variable** to inject your required production values (e.g., `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_MONIME_API_KEY`). Click **Save**.
4. Click the **Run NPM Install** button in the interface to automatically install the required `node_modules` dependencies directly on the server.

#### 4. Restart the Application
1. Click the **Restart** button on the application to command the Passenger runtime to flush the cache and mount the new Next.js production footprint.
2. Verify the live deployment by navigating securely to `https://fundflow.sl`.

---
## 📁 Repository Structure

The repository is structured as a monorepo containing both the frontend application and the backend edge functions:

```text
.
├── web/                    # Next.js Frontend Application
│   ├── app/                # Next.js App Router pages and API routes
│   ├── components/         # Reusable React components (Admin & Member views)
│   ├── lib/                # Utilities, Supabase client, currency formatters
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
│
└── supabase/               # Backend architecture
    ├── functions/          # Deno Edge Functions (monime-webhook, generate-receipt, etc.)
    └── config.toml         # Supabase configuration
```

### Key Edge Functions (`supabase/functions/`)
- `create-monime-checkout`: Securely initializes a payment session with the Monime API and returns the checkout URL.
- `sync-payment-status`: Used by the frontend to safely verify a payment status manually if the user redirects early.
- `monime-webhook`: Listens for asynchronous payment completion events from Monime to finalize transactions.
- `generate-receipt`: Generates downloadable PDF receipts (using `pdf-lib`) and emails them to members (via Resend).
- `allocate-payment-to-balances`: Apportions a successful payment to a member's outstanding obligations chronologically.
- `evaluate-monthly-balances`: CRON job responsible for generating new monthly obligations for active members.

---

## 🛠️ Step-by-Step Contribution Guide

We actively encourage our developers to contribute to this repository. Please follow these instructions to get your local environment set up, make changes, and submit them for review.

### 1. Local Environment Setup

**Prerequisites:**
- [Node.js](https://nodejs.org/en/) (v18+ recommended)
- [Git](https://git-scm.com/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (installed via `npm i supabase -g` or Homebrew)
- Docker (required for running the Supabase local stack)

**Steps:**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "PaymentRail WebApp - KNS"
   ```

2. **Install frontend dependencies**
   ```bash
   cd web
   npm install
   ```

3. **Set up environment variables**
   Copy the example environment file inside the `web/` directory and update the variables using credentials from the active Supabase project and Monime dashboard.
   ```bash
   cp .env.example .env.local
   ```
   *(Required keys include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BASE_URL`)*

4. **Start the local Supabase stack (Backend)**
   Open a new terminal session at the root of the project:
   ```bash
   supabase start
   ```
   *This spins up a local PostgreSQL database, Studio UI, and API Gateway via Docker.*

5. **Start the Next.js Development Server (Frontend)**
   Back in your `web/` directory terminal:
   ```bash
   npm run dev
   ```
   *The app should now be running at [http://localhost:3000](http://localhost:3000).*

### 2. Making Changes

Before making any changes, please ensure you are targeting a specific issue or feature ticket assigned by the Lead Developer.

1. **Create a new branch**
   Always branch off of `main`. Use a descriptive naming convention:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   # or bugfix/ticket-id-description
   ```

2. **Develop features**
   - Ensure you conform to the UI styling patterns (Tailwind CSS, responsive fluid design).
   - If you add robust backend logic, implement it inside a **Supabase Edge Function** rather than Next.js API Routes. Next.js API Routes are strictly for lightweight proxies or webhook redirects.

3. **Lint your code**
   Before committing, run the Next lint script inside the `web/` folder to catch styling and syntax issues:
   ```bash
   npm run lint
   # If errors exist, try auto-fixing:
   npm run lint -- --fix
   ```

### 3. Deploying and Testing Edge Functions

If you modified files in `supabase/functions/`, you must serve them locally to test integrations like Monime or Resend.

1. Create a `.env.local` inside the `supabase/` folder with your test keys (e.g., `MONIME_API_KEY`, `MONIME_SPACE_ID`, `RESEND_API_KEY`).
2. Serve the functions locally:
   ```bash
   supabase functions serve --env-file ./supabase/.env.local
   ```

### 4. Creating a Pull Request

Once your code is tested and clean:

1. **Stage and Commit**
   Use declarative commit messages (we follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)).
   ```bash
   git add .
   git commit -m "feat: implemented monthly recurring obligation chron job"
   ```

2. **Push to the repository**
   ```bash
   git push origin <your-branch-name>
   ```

3. **Open a PR**
   - Go to the GitHub interface.
   - Open a Full Pull Request against the `main` branch.
   - Provide a clear description and screenshots (if UI changes were made).
   - Assign the PR to **Abdul Salim Gani** (Lead Developer).

---

## 🛡️ Best Practices & Guidelines

- **TypeScript First**: Write strictly typed code. Avoid `any` types where possible. Define clear interfaces for database payloads.
- **Error Handling**: Properly wrap edge function invocations and database queries in try/catch blocks. Show user-friendly toast notifications via `sonner` or `SweetAlert2` on failure.
- **Database Security**: Never compromise Row Level Security (RLS). Always assume the client is compromised.
- **Payment Handling**: NEVER modify payment statuses unconditionally on the client. Always verify the status by querying the Monime API (via the `sync-payment-status` function) before updating the database or calculating member balances.
- **Mobile-First Responsive UI**: The Dashboard is heavily utilized on mobile devices across Africa. Test all views natively or computationally in browser dev-tools at a standard `390px` viewport width ensuring horizontal scroll issues are eliminated.

Glad to have you building with us! 🚀
