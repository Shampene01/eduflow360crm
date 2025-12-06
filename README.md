# EduFlow360 CRM - Next.js Application

A modern, component-based React + Next.js 14 application for student accommodation management. This is a complete migration from the legacy HTML/CSS/JavaScript codebase to a scalable, maintainable, and responsive Next.js application.

## Features

- **Property Management** - Add, edit, and manage accommodation properties
- **Student Allocation** - Track and manage student placements
- **Billing & Invoicing** - Create and track invoices
- **Support Ticketing** - Manage support requests
- **NSFAS Integration** - Verify student funding status
- **Role-Based Dashboards** - Separate dashboards for providers and students
- **Authentication** - Firebase-powered authentication with protected routes

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS v4
- **UI Components:** ShadCN UI
- **Icons:** Lucide React
- **Backend:** Firebase (Auth, Firestore, Storage)
- **State Management:** React Context API

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── dashboard/         # Student dashboard
│   ├── provider-dashboard/# Provider dashboard
│   ├── properties/        # Property management
│   ├── students/          # Student management
│   ├── invoices/          # Invoice management
│   └── tickets/           # Support tickets
├── components/            # Reusable React components
│   ├── ui/               # ShadCN UI components
│   ├── Navbar.tsx        # Public navigation
│   ├── Sidebar.tsx       # Dashboard sidebar
│   ├── DashboardHeader.tsx
│   ├── Footer.tsx
│   ├── ProtectedRoute.tsx
│   └── StatCard.tsx
├── contexts/              # React Context providers
│   └── AuthContext.tsx   # Authentication context
├── lib/                   # Utility functions and configs
│   ├── firebase.ts       # Firebase configuration
│   ├── auth.ts           # Authentication helpers
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
└── middleware.ts          # Next.js middleware
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Installation

1. Navigate to the project directory:
   ```bash
   cd eduflow360-nextjs
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see `ENVIRONMENT_SETUP.md`)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

See `ENVIRONMENT_SETUP.md` for required environment variables.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Migration from Legacy Codebase

This application is a complete rewrite of the legacy HTML/CSS/JavaScript codebase:

| Legacy File | New Location |
|-------------|--------------|
| `index.html` | `app/page.tsx` |
| `login.html` | `app/login/page.tsx` |
| `register.html` | `app/register/page.tsx` |
| `dashboard.html` | `app/dashboard/page.tsx` |
| `provider-dashboard.html` | `app/provider-dashboard/page.tsx` |
| `add-property.html` | `app/properties/add/page.tsx` |
| `property-details.html` | `app/properties/[id]/page.tsx` |
| `firebase-config.js` | `lib/firebase.ts` |
| `styles.css` | TailwindCSS utilities |

## Key Improvements

1. **Component-Based Architecture** - Modular, reusable React components
2. **Type Safety** - Full TypeScript support
3. **Modern Styling** - TailwindCSS with ShadCN UI components
4. **Server Components** - Next.js 14 App Router with server/client components
5. **Protected Routes** - Authentication-based route protection
6. **Responsive Design** - Mobile-first responsive layouts
7. **State Management** - React Context for global state
8. **Modular Firebase** - Modern Firebase SDK with modular imports

## Deployment

### Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables in Netlify dashboard

### Vercel

1. Import project to Vercel
2. Environment variables are automatically detected
3. Deploy with zero configuration

## License

MIT License - see LICENSE file for details
