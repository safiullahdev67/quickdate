This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Firebase Backend Setup

This project is pre-configured with Firebase for both client SDK and Admin SDK.

### 1) Install dependencies

Dependencies are already added to `package.json`. If not installed yet:

```bash
npm i firebase firebase-admin
```

### 2) Configure environment variables

Copy the example and fill in values from the Firebase Console:

```bash
cp .env.local.example .env.local
```

Fill the `NEXT_PUBLIC_FIREBASE_*` values from Project Settings → Your Apps → Web App Config.

For server-side Admin access, either:
- Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (with literal \n newlines), or
- Put the full service account JSON into `FIREBASE_SERVICE_ACCOUNT_KEY`.

Files created for you:
- `lib/firebase/client.ts` – Client SDK (Auth, Firestore, Storage)
- `lib/firebase/admin.ts` – Admin SDK initialization for server-only code
- `app/api/firebase/route.ts` – Test endpoint to verify Admin Firestore connectivity

### 3) Verify locally

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000/api/firebase – you should see `{ ok: true, ... }` if your Admin credentials are correct. If you see an error, ensure your `.env.local` is configured properly.

### 4) Deploying

On Vercel (or your host):
- Add the same environment variables from `.env.local` to your project settings.
- No special bundling config is required; the `app/api/firebase/route.ts` forces Node.js runtime for Admin SDK.
- Ensure the service account has adequate IAM roles (e.g., Firestore User, Firebase Auth Admin if needed).

### 5) Using Firebase in the app

Client components:

```ts
import { db, auth, storage } from '@/lib/firebase/client';
// Use Firestore: add/get docs, etc.
```

Server routes or server actions:

```ts
import { adminDb, adminAuth } from '@/lib/firebase/admin';
// Use Admin Firestore/Auth for privileged operations.
```

Security tip: Never expose Admin SDK or service account credentials to the client. Only use `lib/firebase/admin.ts` in server code.
