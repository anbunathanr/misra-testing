# MISRA Web Testing Platform

AI-powered SaaS platform for automating MISRA compliance analysis and UI regression testing.

## Architecture

This is a monorepo containing:

- **packages/frontend**: React dashboard with Material-UI
- **packages/backend**: AWS Lambda services with CDK infrastructure
- **packages/shared**: Shared TypeScript types and utilities

## Quick Start

### Prerequisites

- Node.js 18+
- AWS CLI configured
- Docker (for local development)

### Installation

```bash
# Install dependencies
npm install

# Start local development services
docker-compose up -d

# Build all packages
npm run build
```

### Development

```bash
# Start frontend development server
cd packages/frontend
npm run dev

# Deploy backend infrastructure (staging)
cd packages/backend
npm run deploy
```

### Testing

```bash
# Run all tests
npm test

# Run linting
npm run lint
```

## Project Structure

```
├── packages/
│   ├── frontend/          # React dashboard
│   ├── backend/           # AWS Lambda services
│   └── shared/            # Shared types and utilities
├── .github/workflows/     # CI/CD pipelines
├── docker-compose.yml     # Local development services
└── README.md
```

## Environment Configuration

Copy `.env.example` to `.env` and configure your environment variables.

## Deployment

The project uses AWS CDK for infrastructure as code. Deployments are automated through GitHub Actions:

- **Staging**: Deploys on push to `develop` branch
- **Production**: Deploys on push to `main` branch

## Features

- **MISRA Compliance Analysis**: Automated code analysis against MISRA standards
- **UI Regression Testing**: Playwright-based automated testing
- **AI-Powered Insights**: Machine learning recommendations
- **CI/CD Integration**: GitHub Actions, Jenkins, GitLab CI support
- **Serverless Architecture**: AWS Lambda, S3, DynamoDB
- **Real-time Dashboard**: React with Material-UI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.