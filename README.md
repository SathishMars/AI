# Groupize Workflows

A Next.js 15+ embeddable frontend application for workflow automation with AI-powered workflow generation. Built to gradually migrate features from a Ruby on Rails monolith while maintaining independent functionality.

## 🚀 Tech Stack

- **Next.js 15** with App Router and Turbopack
- **TypeScript** with strict mode
- **Material-UI (MUI) v7** for components
- **Tailwind CSS v4** for styling
- **MongoDB 5.0** (local development) / **AWS DocumentDB** (production)
- **AI Integration**: OpenAI GPT and Anthropic Claude
- **Workflow Engine**: json-rules-engine v7
- **Testing**: Jest with React Testing Library

## 🛠️ Development Setup

### Prerequisites

- **Node.js 18+** (recommended: Node.js 20)
- **npm** (comes with Node.js)
- **MongoDB 5.0** for local development
- **Git** for version control

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
   # macOS (using Homebrew)
   brew tap mongodb/brew
   brew install mongodb-community@5.0
   
   # Ubuntu/Debian
   wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
   sudo apt-get install -y mongodb-org=5.0.*
   
   # Windows: Download from MongoDB website
   ```

2. **Start MongoDB**:
   ```bash
   # macOS/Linux
   brew services start mongodb/brew/mongodb-community@5.0
   # or
   sudo systemctl start mongod
   
   # Windows: Start as Windows Service or run mongod.exe
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

Start the development server:

```bash
# Start with Turbopack (recommended)
npm run dev

# Alternative development commands
yarn dev
pnpm dev
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

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
2. Use MUI v7 components as foundation
3. Use Tailwind v4 for additional styling
4. Ensure responsiveness (phone, tablet, desktop)
5. Write comprehensive tests

## � Docker Deployment

### Prerequisites

- Docker Desktop installed and running
- `.env.local` file configured in project root (required for build)

### Build Docker Image

```bash
# Build the Docker image
npm run docker-build

# Or build manually
docker build -t groupize-workflows:latest .
```

The build process:
- Uses Node.js 22 Alpine (minimal footprint)
- Installs dependencies with npm
- Embeds `.env.local` file in the image
- Creates optimized production build with Next.js standalone output
- Runs as non-root user for security
- Final image size: ~521MB

### Run Docker Container

```bash
# Run container (detached mode, port 3000)
docker run -d -p 3000:3000 --name groupize-workflows-container groupize-workflows:latest

# Run with custom name and port mapping
docker run -d -p 8080:3000 --name my-workflow-app groupize-workflows:latest

# Run in foreground (see logs in terminal)
docker run -p 3000:3000 --name groupize-workflows-container groupize-workflows:latest

# Run with environment variable overrides
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_ENVIRONMENT=documentdb \
  --name groupize-workflows-container \
  groupize-workflows:latest
```

### Manage Running Container

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View container logs
docker logs groupize-workflows-container

# Follow logs in real-time
docker logs -f groupize-workflows-container

# Stop container
docker stop groupize-workflows-container

# Start stopped container
docker start groupize-workflows-container

# Restart container
docker restart groupize-workflows-container

# Remove container (must be stopped first)
docker stop groupize-workflows-container
docker rm groupize-workflows-container

# Remove container forcefully
docker rm -f groupize-workflows-container
```

### Test Docker Container

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2025-10-30T15:35:34.289Z",
#   "environment": "production"
# }

# Check container health status
docker inspect --format='{{.State.Health.Status}}' groupize-workflows-container

# Open in browser
open http://localhost:3000
```

### Export Docker Image

If you need to share or backup the Docker image:

```bash
# Export image as tar file
docker save -o groupize-workflows.tar groupize-workflows:latest

# Export and compress (recommended for sharing)
docker save groupize-workflows:latest | gzip > groupize-workflows.tar.gz

# Load image from tar file (on another machine)
docker load -i groupize-workflows.tar

# Or load from compressed file
gunzip -c groupize-workflows.tar.gz | docker load
```

### Push to Docker Registry

```bash
# Tag image for Docker Hub
docker tag groupize-workflows:latest yourusername/groupize-workflows:latest
docker tag groupize-workflows:latest yourusername/groupize-workflows:v1.0.0

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push yourusername/groupize-workflows:latest
docker push yourusername/groupize-workflows:v1.0.0

# Tag for private registry (e.g., AWS ECR, Google GCR)
docker tag groupize-workflows:latest registry.example.com/groupize-workflows:latest

# Push to private registry
docker push registry.example.com/groupize-workflows:latest
```

### Docker Compose (Optional)

For easier multi-container deployment, create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    image: groupize-workflows:latest
    container_name: groupize-workflows
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_ENVIRONMENT=local
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongodb:
    image: mongo:5.0
    container_name: groupize-mongodb
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=groupize-workflows
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

Then run:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Troubleshooting Docker

```bash
# View Docker images
docker images

# Remove old images
docker image prune -a

# View container resource usage
docker stats groupize-workflows-container

# Execute command inside running container
docker exec -it groupize-workflows-container sh

# View container configuration
docker inspect groupize-workflows-container

# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## 🚀 Production Deployment

### AWS DocumentDB Setup

For production, the application uses AWS DocumentDB:

```bash
# Update environment variables in .env.local before building Docker image
DATABASE_ENVIRONMENT=documentdb
DOCUMENTDB_URI=mongodb://username:password@your-cluster.cluster-xyz.us-east-1.docdb.amazonaws.com:27017/groupize-workflows?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### Build Commands

```bash
# Production build (local)
npm run build

# Start production server (local)
npm start

# Lint code
npm run lint

# Build Docker image for production
npm run docker-build
```

## 📚 Documentation

- **Database Setup**: `db-scripts/README.md`
- **Environment Config**: `docs/environment-configuration.md`
- **Usage Examples**: `db-scripts/mongodb-usage-examples.md`
- **User Stories**: `user-stories/` directory
- **Implementation Notes**: `ai-implementation-summaries/` directory

## 🔧 Troubleshooting

### Common Issues

1. **Dependency Conflicts**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```

2. **MongoDB Connection Issues**:
   - Ensure MongoDB is running: `brew services start mongodb-community@5.0`
   - Check connection string in `.env.local`
   - Verify user credentials: `mongosh "mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows"`

3. **Test Failures**:
   - Ensure all environment variables are set
   - Run tests with: `npm test -- --verbose`

4. **Build Issues**:
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
- [Material-UI Documentation](https://mui.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
