#!/bin/bash
set -e

echo "🚀 Setting up Interview Scheduling Engine..."

npm install
npm run build
npm run lint
npm run typecheck
npm run test

echo ""
echo "✅ Interview Scheduling Engine setup complete!"
echo "No environment variables required (library has no external API dependencies)"
