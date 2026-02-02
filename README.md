# Sharma Coffee Works - E-Commerce Platform

Premium artisanal coffee e-commerce platform for Sharma Coffee Works, featuring coffee products from Coorg since 1987.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher) - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- npm or yarn package manager

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd sharma-coffee-hub

# Step 3: Install dependencies
npm install

# Step 4: Set up environment variables
# Copy .env.example to .env and configure your variables
cp .env.example .env

# Step 5: Start the development server
npm run dev
```

## 🛠️ Technologies

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn-ui** - Component library
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend as a Service (Database, Auth, Storage)
- **Razorpay** - Payment gateway integration

## 📁 Project Structure

```
sharma-coffee-hub/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── context/        # React context providers
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── integrations/   # External service integrations
│   └── assets/         # Static assets (images, videos)
├── supabase/
│   ├── functions/      # Edge Functions
│   └── migrations/     # Database migrations
└── public/             # Public assets
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

See `.env.example` for required environment variables. Key variables include:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `RAZORPAY_KEY_ID` - Razorpay API key (server-side)

## 📦 Features

- 🛒 E-commerce product catalog
- 🛍️ Shopping cart and checkout
- 💳 Payment integration (Razorpay)
- 📦 Order management
- 👤 User authentication
- 📧 Email notifications
- 📱 Responsive design
- ☕ Subscription management
- 🚚 Shipping integration (Nimbuspost)

## 🚀 Deployment

### Build for Production

```sh
npm run build
```

The built files will be in the `dist/` directory.

### Deploy to Vercel/Netlify

1. Connect your repository to Vercel/Netlify
2. Configure environment variables
3. Deploy automatically on push to main branch

## 📝 License

© 2024 Sharma Coffee Works. All rights reserved.

## 🤝 Contributing

This is a private project for Sharma Coffee Works. For issues or questions, please contact the development team.
