#!/bin/bash
# Singulars - Development Server Startup Script

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
  echo "WARNING: .env.local not found. Copy .env.local.example and fill in your Supabase credentials."
  echo "cp .env.local.example .env.local"
fi

# Kill any existing Next.js dev server on port 3000
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

echo "Starting development server..."
npm run dev
