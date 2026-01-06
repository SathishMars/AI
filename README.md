# Groupize Workflows

A Next.js 16+ embeddable frontend application for workflow automation with AI-powered workflow generation. Built to gradually migrate features from a Ruby on Rails monolith while maintaining independent functionality.

## 🚀 Tech Stack

- **Next.js 16** with App Router and Turbopack
- **React 19.2** with strict mode
- **TypeScript** with strict mode
- **shadcn/ui** for components (built on Radix UI primitives)
- **Tailwind CSS v4** for styling
- **MongoDB 8.0** (local development) / **AWS DocumentDB 8.0** (production)
- **AI Integration**: OpenAI GPT and Anthropic Claude via AI SDK
- **Workflow Engine**: json-rules-engine v7
- **Testing**: Jest with React Testing Library

## 🛠️ Development Setup

### Prerequisites

- **asdf** - Version manager for Node.js (see setup below)
- **Node.js 18+** (recommended: Node.js 20) - managed via asdf
- **npm** (comes with Node.js)
- **Docker** and **Docker Compose** - For MongoDB 8.0 and nginx reverse proxy
- **Git** for version control
- **Superadmin privileges** in testing.app.groupize.com
- **Bash shell** - macOS/Linux native, Windows requires WSL

### 0. Install asdf Version Manager and Node.js

This project uses **asdf** to manage the Node.js version automatically. asdf is a version manager that allows you to manage multiple runtime versions with a single CLI tool.

#### Why asdf?

- **Consistent environments** across all developers and CI/CD
- **Automatic version switching** when entering the project directory
- **Single tool** for managing multiple languages (Node.js, Python, Ruby, etc.)

#### Setup Steps

1. **Install asdf (Required)**:

   ```bash
   # Install asdf
   brew install asdf

   # Add to your shell configuration (for zsh - default on macOS)
   echo -e "\n. $(brew --prefix asdf)/libexec/asdf.sh" >> ~/.zshrc
   source ~/.zshrc

   # Verify installation
   asdf --version
   ```

2. **Add Node.js Plugin**:

   ```bash
   asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
   ```

3. **Install Node.js** (run from project directory):

   ```bash
   cd groupize-workflows
   asdf install  # Installs Node.js 20.10.0 from .tool-versions
   ```

4. **Verify Installation**:
   ```bash
   node --version  # Should show v20.10.0
   npm --version   # Should show npm version bundled with Node.js 20.10.0
   ```

**How it works**: The `.tool-versions` file in the project root specifies Node.js 20.10.0. When you're in this directory, asdf automatically uses this version. When you leave the directory, it switches back to whatever version is configured for that location.

> **Note**: We recommend NOT setting a global Node.js version with `asdf global`, as different projects may require different versions. Let asdf manage versions per-project automatically.

### Quick Start Guide

Follow these steps to set up your local development environment:

#### 1. Clone Repository and Install Dependencies

```bash
# Clone the develop branch
git clone -b develop <repository-url>
cd groupize-workflows

# Install dependencies
npm install --legacy-peer-deps
```

> **Note**: The `--legacy-peer-deps` flag may be required due to version conflicts between OpenAI SDK, Anthropic SDK, and Zod versions.

#### 2. Configure Environment Variables

Copy the environment template and set your AI API keys:

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local and set your AI API keys
nano .env.local  # or use your preferred editor
```

**Required Configuration:**

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (required)

All other settings use defaults suitable for local development.

#### 3. Run Setup Script (Administrator Privileges Required)

This script sets up SSL certificates and adds testing.app.groupize.com to your /etc/hosts file:

```bash
npm run setup:remote-groupize
```

**What this does:**

- Generates browser-trusted SSL certificates using mkcert
- Adds `127.0.0.1 testing.app.groupize.com` to `/etc/hosts`
- Installs mkcert CA certificate in your system keychain

> **Note**: You'll be prompted for your administrator password to modify /etc/hosts and install the certificate.

#### 4. Set Up MongoDB Container

Start MongoDB 8.0 in a Docker container:

```bash
# Run the interactive menu
npm run mongodb

# Select option 1 to start MongoDB
# Or directly: npm run mongodb up
```

**Verify MongoDB is running:**

```bash
npm run mongodb health
# Expected output: ✓ All health checks passed!
```

#### 5. (Optional) Install MongoDB Compass

For a visual interface to browse MongoDB collections:

1. Download from [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect using:
   - **Connection String**: `mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows`
   - Or use individual fields:
     - **Host**: localhost
     - **Port**: 27017
     - **Username**: groupize_app
     - **Password**: gr0up!zeapP
     - **Database**: groupize-workflows

#### 6. Start Nginx Reverse Proxy

Start the nginx reverse proxy to route requests between your local Next.js app and the testing environment:

```bash
npm run nginx
```

**What this does:**

- Routes `/aime/*` → Your local Next.js dev server (port 3000)
- Routes everything else → Real testing.app.groupize.com Rails API
- Forwards authentication cookies from Rails to Next.js

**Verify nginx is running:**

```bash
npm run nginx status
```

#### 7. Start Next.js Development Server

In a new terminal window:

```bash
npm run dev
```

Your local Next.js app is now running on port 3000 (behind nginx proxy).

#### 8. Authenticate via Testing Environment

1. **Use your SSO bookmark** to sign in to testing.app.groupize.com
2. Navigate to: **https://testing.app.groupize.com/ops/tools/aime_ai**
3. **Select an account and organization**
4. Click **"Access AIME AI"**

> **Important**: You must have superadmin privileges in testing.app.groupize.com

#### 9. Initialize Database (First Time Only)

If this is your first time setting up:

1. Navigate to: **https://testing.app.groupize.com/aime/initialize**
2. Click **"Initialize Database"**
3. Wait for confirmation that all collections and indexes are created

**What this creates:**

- `workflowTemplates` collection with indexes
- `aimeConversations` collection with indexes
- Initial test data (if configured)

---

### You're All Set! 🎉

Access your local app at: **https://testing.app.groupize.com/aime/**

- Local Next.js changes reflect immediately with Hot Module Replacement
- Authentication via real testing environment
- Real data from testing.app.groupize.com Rails API
- MongoDB running locally in Docker

---

### Alternative MongoDB Setup

#### Option A: MongoDB 8.0 with Docker (Recommended - Already Covered Above)

See step 4 above for Docker setup instructions.

**Essential MongoDB Commands:**

- `npm run mongodb up` - Start MongoDB
- `npm run mongodb down` - Stop MongoDB
- `npm run mongodb status` - Check if MongoDB is running
- `npm run mongodb health` - Run health checks
- `npm run mongodb reset` - Delete all data and start fresh
- `npm run mongodb info` - Display connection details
- `npm run mongodb logs` - View live logs
- `npm run mongodb shell` - Access MongoDB shell

For detailed Docker MongoDB setup, see [`local-dev/mongodb/README.md`](./local-dev/mongodb/README.md)

#### Option B: Local MongoDB Installation (Alternative)

## If you prefer to install MongoDB locally without Docker:

## 🔄 Daily Development Workflow

Once you've completed the setup above, your daily workflow is simple:

```bash
# Start MongoDB (if not already running)
npm run mongodb up

# Start nginx reverse proxy (if not already running)
npm run nginx

# Start Next.js dev server
npm run dev

# Access your app
open https://testing.app.groupize.com/aime/
```

**Stopping Services:**

```bash
# Stop Next.js (Ctrl+C in terminal)

# Stop nginx
npm run nginx stop

# Stop MongoDB
npm run mongodb down
```

---

## 🧹 Cleanup

To remove the local development setup:

```bash
# Remove /etc/hosts entry and uninstall certificate
npm run cleanup:remote-groupize

# Stop and remove MongoDB container
npm run mongodb down

# Stop nginx
npm run nginx stop
```

---

## 🚀 Advanced: Alternative Development Modes

The application supports additional development modes beyond the standard setup:

#### Option B: Local MongoDB Installation (Without Docker)

If you prefer to install MongoDB locally without Docker:

1. **Install MongoDB 8.0**:

   ```bash
   brew tap mongodb/brew
   brew install mongodb-community@8.0
   ```

2. **Start MongoDB**:

   ```bash
   brew services start mongodb-community@8.0
   ```

3. **Set up Database and User**:

   ```bash
   # Run the setup script from db-scripts folder
   mongosh < db-scripts/01-initialize-fresh-database.js
   ```

   Or manually create the user in mongosh:

   ```bash
   mongosh
   # In mongosh shell:
   use admin
   db.createUser({
     user: 'groupize_app',
     pwd: 'gr0up!zeapP',
     roles: [{ role: 'root', db: 'admin' }]
   })
   ```

#### Option C: MongoDB Atlas (Cloud)

1. Create a MongoDB Atlas account
2. Create a cluster (free tier available)
3. Get connection string and update `.env.local`
4. Update `DATABASE_ENVIRONMENT=local` and connection details

---

## 💡 Additional Development Modes

The application also supports other development configurations:

#### Local Rails + Next.js Mode (Full Local Development)

**Features:**

- Both Rails and Next.js running locally
- Complete local development environment
- No external dependencies
- Full control over both applications
- HTTP only (no SSL certificates required)

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│  Browser: http://groupize.local                        │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  nginx Reverse Proxy (port 80)                         │
│  - Routes /aime/* → Next.js (port 3001)                │
│  - Routes /* → Rails (port 3000)                       │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐         ┌─────────────────────────┐
│  Next.js         │         │  Rails                  │
│  localhost:3001  │         │  localhost:3000         │
│  /aime routes    │         │  All other routes       │
└──────────────────┘         └─────────────────────────┘
```

**Quick Setup:**

```bash
# 1. Initialize local Rails setup (adds to /etc/hosts and starts nginx)
npm run setup:local-rails:init

# 2. Start Rails (in separate terminal)
cd <your-rails-app-path>
rails s -p 3000

# 3. Start Next.js
npm run dev:local-rails

# 4. Access applications
# Next.js: http://groupize.local/aime
# Rails: http://groupize.local
```

**What's Needed:**

- Checks Docker is running
- Adds `groupize.local` to `/etc/hosts`
- Starts nginx Docker container with reverse proxy configuration
- Works on both macOS and Linux

**Requirements:**

- **Docker** and **Docker Compose** installed and running
- Rails application ready to run on port 3000
- Next.js application (this repo)

**Key Features:**

- nginx running in Docker container (no local nginx installation needed)
- WebSocket support for Next.js HMR and Rails ActionCable
- Cookie forwarding for JWT authentication
- Extended timeouts for AI operations (5+ minutes)
- Gzip compression enabled
- Health check endpoint

**Management Commands:**

```bash
# Check nginx status
npm run nginx:local-rails status

# View logs
npm run nginx:local-rails logs

# Health check (checks Rails and Next.js connectivity)
npm run nginx:local-rails health

# Restart nginx
npm run nginx:local-rails restart

# Stop nginx
npm run nginx:local-rails stop

# Check ports
lsof -i :80    # nginx
lsof -i :3000  # Rails
lsof -i :3001  # Next.js
```

**Troubleshooting:**

```bash
# If nginx won't start, check if port 80 is in use
lsof -i :80

# View container logs
docker logs groupize-workflows-nginx-local

# Check Docker is running
docker info

# Verify Rails is accessible
curl http://localhost:3000

# Verify Next.js is accessible
curl http://localhost:3001/aime
```

**Cleanup:**

```bash
# Complete cleanup with npm script
npm run setup:local-rails:cleanup
```

**npm Scripts:**

- `npm run setup:local-rails:init` - Initialize (adds /etc/hosts + starts nginx)
- `npm run setup:local-rails:cleanup` - Cleanup (stops nginx + removes /etc/hosts)
- `npm run nginx:local-rails` - Start nginx Docker container
- `npm run nginx:local-rails status` - Check nginx status
- `npm run nginx:local-rails logs` - View nginx logs
- `npm run nginx:local-rails health` - Run health checks
- `npm run nginx:local-rails stop` - Stop nginx container
- `npm run dev:local-rails` - Start Next.js on port 3001

---

#### Split-Routing Mode (Real Testing API + Local Next.js)

**Features:**

- Runs on **port 3000**
- **No local Rails needed** - uses real testing Rails API
- Real authentication and JWT tokens from testing environment
- Real testing data
- Faster setup - focus on Next.js development only

**Access:** `https://testing.app.groupize.com/aime/` (requires nginx setup)

**How It Works:**
This setup uses a **local HTTP reverse proxy (nginx)** to route requests:

- Requests to `/aime/*` → proxied to your local Next.js dev server
- All other requests → proxied to the real testing Rails API
- **JWT authentication cookies** from the Rails app are forwarded to Next.js, allowing seamless authentication

**Setup Steps:**

1. Configure nginx proxy for split-routing (see section 5 below)
2. Create `.env.testing` from `.env.example` with split-routing values
3. Start Next.js: `npm run dev` (automatically uses `.env.testing` if present)
4. **Authenticate via Rails app**: Go to `https://testing.app.groupize.com/ops/tools/aime_ai` and select an account/org
5. Access the app: `https://testing.app.groupize.com/aime/` (you'll be authenticated via the JWT cookie from Rails)

> **Note**: See `docs/ENV_VARIABLES.md` for complete environment variable reference.

### 5. Nginx Reverse Proxy Setup (Integration with Rails)

When running alongside the Rails application (either locally or with split-routing), use nginx as a **local HTTP reverse proxy** to route requests and forward authentication cookies.

**📖 For complete setup instructions, see: [`local-dev/SETUP_GUIDE.md`](./local-dev/SETUP_GUIDE.md)**

#### Quick Overview

The application supports two proxy modes:

1. **Local Rails + Next.js** - Both Rails and Next.js running locally
   - nginx in Docker: `local-dev/nginx-local-rails/` (auto-started by setup script)
   - URL: `http://groupize.local/aime/`
   - Rails on port 3000, Next.js on port 3001
   - nginx forwards JWT cookies between Rails and Next.js
   - **Automated Setup:** `npm run setup:local-rails:init`
   - **Uses Docker nginx** - no local nginx installation required
   - See "Local Rails + Next.js Mode" section above for full details

2. **Split-Routing** - Local Next.js with real testing Rails API
   - nginx in Docker: `local-dev/nginx/` (Docker Compose setup)
   - URL: `https://testing.app.groupize.com/aime/`
   - Next.js on port 3000, Rails API at testing environment
   - **Authentication:** Go to `https://testing.app.groupize.com/ops/tools/aime_ai` to select account/org and get JWT cookie
   - nginx reverse proxy forwards JWT authentication cookies from Rails to your local Next.js dev server

#### Quick Start

```bash
# For Local Rails + Next.js mode (Docker nginx):
npm run setup:local-rails:init  # Add to /etc/hosts and start nginx
# Then start Rails and Next.js

# For Split-Routing mode (Docker nginx with SSL):
npm run setup:remote-groupize  # Generates SSL certs and updates /etc/hosts
npm run nginx  # Starts nginx Docker container
npm run dev    # Starts Next.js
```

#### URL Structure

The nginx proxy uses Next.js `basePath` configuration:

- User visits: `http://groupize.local/aime/*` or `https://testing.app.groupize.com/aime/*`
- nginx passes full path to Next.js
- Next.js configured with `basePath: '/aime'` in `next.config.ts`
- Everything else → Rails app

**Example:**

```
User visits:     http://groupize.local/aime/workflows/configure/123
nginx proxies:   /aime/workflows/configure/123 → Next.js
Next.js serves:  src/app/workflows/configure/[id]/page.tsx
```

**Important Notes:**

- ✅ Next.js `<Link>` components automatically prepend basePath
- ⚠️ Images require basePath: `src={`${NEXT_PUBLIC_BASE_PATH}/image.png`}` (see `src/app/utils/api.ts`)
- ✅ API fetch calls use `apiFetch()` helper which adds basePath
- ✅ Shared authentication via forwarded cookies
- ✅ Future micro-apps: `/aime/approvals/`, `/aime/analytics/`, etc.

For detailed setup, troubleshooting, and switching between modes, see [`local-dev/SETUP_GUIDE.md`](./local-dev/SETUP_GUIDE.md).

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test mongodb-connection
```

### Test Coverage Requirements

- **Minimum 90% code coverage** required
- All components must have unit tests
- Database utilities must have integration tests
- API routes must have endpoint tests

### Test Structure

```
src/test/
├── app/
│   ├── components/     # Component tests
│   ├── utils/         # Utility function tests
│   └── api/           # API route tests
└── __mocks__/         # Mock implementations
```

## 🏗️ Project Structure

```
groupize-workflows/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── components/       # Reusable components
│   │   ├── utils/           # Utility functions
│   │   ├── validators/      # Form validation (Zod)
│   │   ├── types/           # TypeScript types
│   │   └── api/             # API routes
│   └── test/                # Test files (mirrors src structure)
├── db-scripts/              # Database setup scripts
├── user-stories/            # User stories and epics
├── ai-implementation-summaries/  # AI implementation notes
├── docs/                    # Additional documentation
└── public/                  # Static assets
```

## 🔧 Development Guidelines

### Code Quality

- **TypeScript**: Strict mode enabled - handle all type errors
- **Linting**: Run `npm run lint` before committing
- **Testing**: Maintain 90%+ test coverage
- **Git**: Use conventional commit messages (no emojis)

### Database Usage

**CRITICAL**: Always use the connection pool for database operations:

```typescript
// ✅ Correct way - Always use connection pool
import { getMongoDatabase } from "@/app/utils/mongodb-connection";

async function example() {
  const db = await getMongoDatabase();
  const collection = db.collection("workflowTemplates");
  // ... your operations
}

// ❌ Never create direct connections
```

### Component Development

1. Check existing components in `src/app/components/` before creating new ones
2. Use shadcn/ui components (built on Radix UI) as foundation
3. Use Tailwind v4 for styling and layout adjustments
4. Ensure responsiveness (phone, tablet, desktop)
5. Write comprehensive tests

## 🚀 Production Deployment

### AWS DocumentDB Setup

For production, the application uses AWS DocumentDB:

```bash
# Update environment variables
DATABASE_ENVIRONMENT=documentdb
DOCUMENTDB_HOST=your-cluster.cluster-xyz.us-east-1.docdb.amazonaws.com
DOCUMENTDB_USER=your-username
DOCUMENTDB_PASSWORD=your-password
```

### Build Commands

```bash
# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📚 Documentation

- **Database Setup**: `db-scripts/README.md`
- **Environment Config**: `docs/environment-configuration.md`
- **Usage Examples**: `db-scripts/mongodb-usage-examples.md`
- **User Stories**: `user-stories/` directory
- **Implementation Notes**: `ai-implementation-summaries/` directory

## 🔧 Troubleshooting

### Common Issues

1. **Node.js Version Issues**:

   ```bash
   # Ensure asdf is properly installed
   asdf --version

   # Check if Node.js plugin is installed
   asdf plugin list

   # Reinstall the correct Node.js version
   asdf install nodejs 20.10.0

   # Verify the version in the project directory
   cd groupize-workflows
   node --version  # Should show v20.10.0
   ```

   For more help, see the [asdf troubleshooting guide](https://asdf-vm.com/guide/getting-started.html)

2. **Dependency Conflicts**:

   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```

3. **MongoDB Connection Issues**:
   - Ensure MongoDB is running: `npm run mongodb status`
   - For Docker: Check container health: `npm run mongodb health`
   - For local: Ensure MongoDB is running: `brew services start mongodb-community@8.0`
   - Check connection string in `.env.local`
   - Verify user credentials: `mongosh "mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows"`

4. **Test Failures**:
   - Ensure all environment variables are set
   - Run tests with: `npm test -- --verbose`

5. **Build Issues**:
   - Clear Next.js cache: `rm -rf .next`
   - Rebuild: `npm run build`

### Environment Switching

```bash
# Switch to local MongoDB
DATABASE_ENVIRONMENT=local

# Switch to AWS DocumentDB
DATABASE_ENVIRONMENT=documentdb
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure all tests pass: `npm test`
5. Run linting: `npm run lint`
6. Commit with descriptive message
7. Create pull request

## 📄 License

[Add your license information here]

## 🔗 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [asdf Documentation](https://asdf-vm.com/)
