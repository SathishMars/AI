# Groupize Workflows


A Next.js 16+ embeddable frontend application for workflow automation with AI-powered workflow generation. Built to gradually migrate features from a Ruby on Rails monolith while maintaining independent functionality.

## 🚀 Tech Stack

- **Next.js 16** with App Router and Turbopack
- **React 19.2** with strict mode
- **TypeScript** with strict mode
- **shadcn/ui** for components (built on Radix UI primitives)
- **Tailwind CSS v4** for styling
- **MongoDB 5.0** (local development) / **AWS DocumentDB** (production)
- **AI Integration**: OpenAI GPT and Anthropic Claude via AI SDK
- **Workflow Engine**: json-rules-engine v7
- **Testing**: Jest with React Testing Library

## 🛠️ Development Setup

### Prerequisites

- **asdf** - Version manager for Node.js (see setup below)
- **Node.js 18+** (recommended: Node.js 20) - managed via asdf
- **npm** (comes with Node.js)
- **MongoDB 5.0** for local development
- **Git** for version control

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

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd groupize-workflows

# Install dependencies (use legacy peer deps flag if needed)
npm install --legacy-peer-deps

# If you encounter dependency conflicts, try:
npm install --legacy-peer-deps --force
```

> **Note**: The `--legacy-peer-deps` flag may be required due to version conflicts between OpenAI SDK, Anthropic SDK, and Zod versions.

### 2. Environment Configuration

Copy the environment template and configure your settings:

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
nano .env.local  # or use your preferred editor
```

#### Required Environment Variables

```bash
# Database Configuration
DATABASE_ENVIRONMENT=local  # 'local' for MongoDB, 'documentdb' for AWS DocumentDB

# MongoDB (Local Development)
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USER=groupize_app
MONGODB_PASSWORD=gr0up!zeapP
MONGODB_DATABASE=groupize-workflows

# AI API Keys (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# Application Settings
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_ENABLE_MOCK_DATA=true
```

### 3. Database Setup

#### Option A: Local MongoDB Setup

1. **Install MongoDB 5.0**:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community@5.0
   ```

2. **Start MongoDB**:
   ```bash
   brew services start mongodb/brew/mongodb-community@5.0
   ```

3. **Set up Database and User**:
   ```bash
   # Run the setup script
   mongosh < db-scripts/setup-mongodb.js
   
   # Or run commands manually in mongosh:
   mongosh
   ```

4. **Verify Connection**:
   ```bash
   # Test the connection
   npm test mongodb-connection
   ```

#### Option B: MongoDB Atlas (Cloud)

1. Create a MongoDB Atlas account
2. Create a cluster (free tier available)
3. Get connection string and update `.env.local`
4. Update `DATABASE_ENVIRONMENT=local` and connection details

### 4. Development Server

The application supports three development modes:

#### Standalone Mode (Frontend-Only Development)

Perfect for UI/component development without Rails:

```bash
npm run dev
```

**Features:**
- Runs on **port 3000**
- **Skips JWT verification** - uses mocked API responses
- No Rails connection needed
- No authentication required
- Perfect for frontend-only development

**Access:** `http://localhost:3000/aime/`

**Environment Variables (Optional):**
```bash
AUTH_MODE=standalone  # Set automatically by npm run dev
```

#### Local Embedded Mode (Full Stack Development)

For development with local Rails authentication and JWT verification:

```bash
npm run dev:embedded
```

**Features:**
- Runs on **port 3001**
- **Verifies JWT tokens** via JWKS endpoint from Rails
- Requires Rails running locally at `NEXT_PUBLIC_RAILS_BASE_URL`
- Full SSO experience with Rails
- Redirects to Rails login if unauthorized

**Access:** `http://groupize.local/aime/` (requires nginx setup)

**Environment Variables (Required):**
```bash
AUTH_MODE=embedded
NEXT_PUBLIC_RAILS_BASE_URL=http://groupize.local
COOKIE_NAME=gpw_session
```

**Setup Steps:**
1. Configure nginx proxy (see section 5 below)
2. Start Rails: `cd ../reg_app && rails s -p 3000`
3. Start Next.js: `npm run dev:embedded`
4. Access via: `http://groupize.local/aime/`

#### Split-Routing Mode (Real Testing API + Local Next.js)

**NEW!** Develop Next.js locally while using the real testing environment's Rails API:

**Features:**
- Runs on **port 3000**
- **No local Rails needed** - uses real testing Rails API
- Real authentication and JWT tokens from testing environment
- Real testing data
- Faster setup - focus on Next.js development only

**Access:** `https://testing.app.groupize.com/aime/` (requires nginx setup)

**Setup Steps:**
1. Configure nginx proxy for split-routing (see section 5 below)
2. Create `.env.testing` from `.env.example` with split-routing values
3. Start Next.js: `npm run dev` (automatically uses `.env.testing` if present)
4. Access via: `https://testing.app.groupize.com/aime/`

> **Note**: See `docs/ENV_VARIABLES.md` for complete environment variable reference.

### 5. Nginx Proxy Setup (Integration with Rails)

When running alongside the Rails application (either locally or with split-routing), use nginx to proxy requests.

**📖 For complete setup instructions, see: [`local-dev/SETUP_GUIDE.md`](./local-dev/SETUP_GUIDE.md)**

#### Quick Overview

The application supports two proxy modes:

1. **Local Embedded** - Both Rails and Next.js running locally
   - nginx config: `local-dev/nginx.local.conf`
   - URL: `http://groupize.local/aime/`
   - Rails on port 3000, Next.js on port 3001

2. **Split-Routing** - Local Next.js with real testing Rails API
   - nginx config: `local-dev/nginx.testing.conf` (create from `nginx.testing.example`)
   - URL: `https://testing.app.groupize.com/aime/`
   - Next.js on port 3000, Rails API at testing environment

#### Quick Start

```bash
# One-time setup
cd local-dev

# For Local Embedded mode:
cp nginx.local.conf /opt/homebrew/etc/nginx/servers/groupize.local.conf

# For Split-Routing mode:
cp nginx.testing.example nginx.testing.conf
# Edit nginx.testing.conf to replace YOUR_USERNAME with your username
cp nginx.testing.conf /opt/homebrew/etc/nginx/servers/testing.app.groupize.com.conf

# Restart nginx
brew services restart nginx
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
import { getMongoDatabase } from '@/app/utils/mongodb-connection';

async function example() {
  const db = await getMongoDatabase();
  const collection = db.collection('workflowTemplates');
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
   - Ensure MongoDB is running: `brew services start mongodb-community@5.0`
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
