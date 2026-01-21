# KNS PaymentRail - Multitenant Payment Management System

A comprehensive multitenant payment management platform that helps organizations track payments, manage members, and generate receipts all in one secure, centralized system.

## Overview

KNS PaymentRail (formerly KNS MultiRail) is a full-stack payment management solution built for organizations in Sierra Leone. The platform provides:

- **Multi-tenant Architecture**: Complete data isolation for each organization
- **Role-Based Access Control**: Three distinct roles (Super Admin, Organization Admin, Member)
- **Payment Processing**: Integration with Monime payment gateway
- **Member Management**: Streamlined registration with approval workflows
- **Receipt Generation**: Automatic PDF receipt generation for all transactions
- **Real-time Updates**: Live notifications and payment tracking

## Tech Stack

### Web Application
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payment Gateway**: Monime

### Mobile Application
- **Framework**: Flutter
- **Language**: Dart
- **State Management**: Riverpod
- **Routing**: GoRouter

### Backend
- **Database**: Supabase (PostgreSQL)
- **Edge Functions**: Supabase Edge Functions (TypeScript)
- **Storage**: Supabase Storage

## Project Structure

```
.
├── web/                 # Next.js web application
│   ├── app/            # Next.js app router pages
│   ├── components/     # React components
│   └── lib/            # Utilities and helpers
├── mobile/             # Flutter mobile application
│   └── lib/            # Dart source code
├── supabase/           # Supabase configuration and edge functions
│   ├── functions/      # Edge functions
│   └── config.toml     # Supabase config
└── scripts/            # Utility scripts
```

## Features

### For Organizations
- Register and manage your organization
- Create custom payment tabs for members
- Approve/reject member applications
- Track all payments in real-time
- Generate comprehensive reports
- Manage member profiles and status

### For Members
- Register and request to join organizations
- View payment history and outstanding balances
- Make payments through integrated gateway
- Download PDF receipts
- Receive real-time notifications
- View payment tabs and due dates

### For Super Admins
- Manage all organizations
- Monitor platform activity
- View system-wide analytics
- Manage user roles and permissions

## Getting Started

### Prerequisites
- Node.js 18+ (for web application)
- Flutter SDK (for mobile application)
- Supabase account and project
- Monime API credentials

### Web Application Setup

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MONIME_API_KEY`
   - `MONIME_SECRET_KEY`

5. Run the development server:
```bash
npm run dev
```

### Mobile Application Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
flutter pub get
```

3. Configure your Supabase credentials in the app

4. Run the application:
```bash
flutter run
```

### Supabase Setup

1. Initialize Supabase locally (optional):
```bash
supabase init
```

2. Start local Supabase (optional):
```bash
supabase start
```

3. Deploy edge functions:
```bash
supabase functions deploy
```

## Development

### Code Style
- TypeScript/JavaScript: Follow Next.js and React best practices
- Dart: Follow Flutter style guide
- Use ESLint and Prettier for code formatting

### Database Migrations
All database migrations are managed through Supabase migrations. Run migrations through the Supabase dashboard or CLI.

## Deployment

### Web Application
The web application can be deployed to:
- Vercel (recommended for Next.js)
- Netlify
- Any Node.js hosting platform

### Mobile Application
Build and deploy to:
- Google Play Store (Android)
- Apple App Store (iOS)

### Supabase
Deploy edge functions and database changes through:
- Supabase Dashboard
- Supabase CLI

## Contributing

This is a private project under KNS Consultancy and College. For contributions, please contact the development team.

## License

Proprietary - All rights reserved

## Support

For support and inquiries, please contact:
- **Organization**: KNS Consultancy and College
- **Lead Engineer**: Engineer Salim

## Acknowledgments

Built with ❤️ by the KNS development team.
