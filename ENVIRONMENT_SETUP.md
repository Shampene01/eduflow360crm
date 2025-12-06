# Environment Setup

Create a `.env.local` file in the root of the project with the following variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# NSFAS Webhook (optional)
NEXT_PUBLIC_NSFAS_WEBHOOK_URL=your_webhook_url
```

## Current Default Values

The application has fallback values configured in `src/lib/firebase.ts` for the existing Firebase project:

- **Project ID:** tym-crm
- **Auth Domain:** tym-crm.firebaseapp.com

## Getting Started

1. Copy the environment variables above to a new `.env.local` file
2. Replace the placeholder values with your actual Firebase credentials
3. Run `npm run dev` to start the development server

## Production Deployment

For production deployments (e.g., Netlify, Vercel), add these environment variables in your hosting provider's dashboard.
