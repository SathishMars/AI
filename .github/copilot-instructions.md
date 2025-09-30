# Groupize Embed - AI Agent Instructions

## Project Overview

This is a Next.js 15+ embeddable frontend application designed to gradually migrate features from a Ruby on Rails monolith. The app is built to be embedded in RoR pages via script tags while maintaining independent functionality.

**Tech Stack:**
- Next.js 15 with App Router and Turbopack
- TypeScript with strict mode
- Material-UI (MUI) v7 for components
- Tailwind CSS v4 for additional styling  
- MongoDB and Postgres database connection
- JWT-based session management

## Key Architecture Patterns

### Embeddable Design
- Build components that can function within script tag contexts
- Consider viewport constraints and parent page styling conflicts
- Use `viewport` metadata in layout.tsx to prevent scaling issues in embedded contexts
- Test components both standalone and embedded

### Styling Strategy
- Use MUI components for consistent design system
- Use tailwind for creating styled components if MUI components need to be modified to match the given design
- Follow wireframes or UI designs mentioned in the stories closely
- Maintain a uniform look and feel across all components and pages
- Allow for custom themes and easy switch to those themes


### Font Loading Pattern
Follow the established pattern in `layout.tsx`:
```tsx
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
```

### Workflow Architecture
**Multi-Step Workflow System**: Build workflows with conditional branching and pre-built function integration
- **Core Components**: Workflow builder UI, rule engine, AI processing, visualization, execution engine
- **Rules Engine**: **CRITICAL**: All workflow rules MUST use `json-rules-engine` for evaluation. AI-generated rules should produce valid json-rules-engine schema format
- **AI Integration**: Use OpenAI/Anthropic for natural language to JSON workflow conversion (json-rules-engine format) and Mermaid flowchart generation
- **Visualization**: Use `react-md-editor` (https://github.com/uiwjs/react-md-editor) for markdown viewing with Mermaid support
- **Execution**: Step-by-step workflow execution with success/failure branching using `json-rules-engine` (https://github.com/CacheControl/json-rules-engine) evaluation
- **Data Structure**: Workflows contain steps with conditions, success/failure paths, and pre-built function calls
- **Rule condition schema**:
```json
{
  "title": "JsonRulesEngine Rule Schema",
  "description": "Schema for validating rules used by json-rules-engine",
  "type": "object",
  "required": ["conditions", "event"],
  "properties": {
    "conditions": {
      "type": "object",
      "properties": {
        "all": {
          "type": "array",
          "items": { "$ref": "#/definitions/condition" }
        },
        "any": {
          "type": "array",
          "items": { "$ref": "#/definitions/condition" }
        }
      },
      "minProperties": 1,
      "additionalProperties": false
    },
    "event": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "type": "string" },
        "params": { "type": "object" }
      },
      "additionalProperties": false
    },
    "priority": { "type": "integer", "minimum": 1 },
    "onSuccess": { "type": "string" },
    "onFailure": { "type": "string" }
  },
  "definitions": {
    "condition": {
      "type": "object",
      "properties": {
        "all": {
          "type": "array",
          "items": { "$ref": "#/definitions/condition" }
        },
        "any": {
          "type": "array",
          "items": { "$ref": "#/definitions/condition" }
        },
        "fact": { "type": "string" },
        "operator": { "type": "string" },
        "value": {},
        "path": { "type": "string" },
        "params": { "type": "object" }
      },
      "minProperties": 1,
      "additionalProperties": false
    }
  }
}
```
- **Workflow Example**:
```json
{
  "steps": {
    "start": {
      "name": "Start", 
      "type": "trigger",
      "action": "onMRFSubmit",  // pre built libraries of triggers
      "params": { "mrfID": "abcd", "MRF Name": "New Event Request" },
      "nextSteps": ["checkForApproval"], // if the step is not conditional, we will just define the next step else there will be a onSuccess and onFailure tags
    },
    "checkForApproval": {
      "name": "Check for Approval",
      "type": "condition",
      "condition": {  // json-rules-engine condition schema
        "all": [
          { "fact": "form.numberOfAttendees", "operator": "greater than", "value": 100 },
          {
            "any": [
              { "fact": "user.role", "operator": "not equal", "value": "admin" },
              { "fact": "user.department", "operator": "not equal", "value": "management" }
            ]
          }
        ]
      },
      "onSuccess": "sendForApproval", // if condition is true
      "onFailure": "createEvent"
    },
    "sendForApproval": { 
        "type": "action", 
        "action": "functions.requestApproval", 
        "params": { "to": "manager@example.com", "cc": "team@example.com" },
        "onSuccess": "createEvent",
        "onFailure": "terminateWithFailure" // if the action fails, we will go to step
    },
    "createEvent": { 
      "name": "Create Event", 
      "type": "action", 
      "action": "functions.createEvent", 
      "params": { "mrfID": "abcd" },
      "nextSteps": ["end"]
    },
    "terminateWithFailure": { 
      "name": "Notify User of Failure", 
      "type": "action", 
      "action": "functions.sendFailureEmail", 
      "params": { "emailTemplateID": "workflow_failure", "cc": "team@example.com" },
      "nextSteps": ["end"]
    },
    "end": { "type": "end", "result": "success" },
    "terminateWithFailure": { "type": "end", "result": "no_open" }
  },
}
``` 

## Development Workflow

### Build Commands
- Development: `npm run dev` (uses Turbopack for fast builds)
- Production: `npm run build` (uses Turbopack)
- Linting: `npm run lint`

### File Organization (App Router Structure)
- **App Router**: Use `src/app/` directory with Next.js 15 App Router conventions
- **Import path alias**: `@/*` maps to `./src/*`
- **Components**: Reusable components go in `src/app/components/`
- **Utilities**: Helper functions and utilities in `src/app/utils/`
- **Validators**: Form validation schemas in `src/app/validators/`
- **Types**: TypeScript type definitions in `src/app/types/`
- **Tests**: Mirror source structure in `src/test/` (e.g., `src/test/app/components/`)
- **API Routes**: Use `src/app/api/` for backend API routes
- **Global Styles**: Tailwind imports and CSS variables in `src/app/globals.css`
- **Layout**: Main layout and metadata in `src/app/layout.tsx`
- **Pages**: Each page or route in its own folder under `src/app/` (e.g., `src/app/workflow-builder/page.tsx`)
- **Story & Epic Management**: Store user stories and epics in `user-stories/` folder at project root (outside `src/`)
- **AI Implementation Summaries**: Store AI implementation notes and summaries in `ai-implementation-summaries/` folder at project root (outside `src/`)
- **Critical Files**:
  - `src/app/layout.tsx` - Main layout with font loading and metadata
  - `src/app/globals.css` - Tailwind imports and CSS variables
  - `next.config.ts` - Next.js configuration (currently minimal)
  - `package.json` - Dependencies and build scripts (CHECK BEFORE ADDING NEW PACKAGES)
  - `user-stories/` - User stories and epics (outside src folder)
  - `ai-implementation-summaries/` - AI implementation notes and summaries (outside src folder)


## Package Management

### Dependency Guidelines
**CRITICAL**: Always check `package.json` before adding new packages to avoid duplicating functionality.
**CRITICAL**:  Before creating new code, always check existing folders for reusable components, utilities, validators, and types.


### Version Compliance Requirements
**MANDATORY**: When recommending or writing code, ALWAYS reference the EXACT versions specified in `package.json`. Never assume or use outdated API patterns.

**Current Exact Versions (as of package.json):**
- **Next.js**: `15.5.3` - Use App Router patterns, Turbopack features
- **React**: `19.1.0` - Follow React 19 patterns and hooks
- **Material-UI**: `@mui/material@^7.3.2`, `@mui/icons-material@^7.3.2` - Use MUI v7 API
- **Tailwind CSS**: `^4` - Use Tailwind v4 syntax and features
- **Zod**: `^4.1.11` - Use Zod v4 API (breaking changes from v3)
- **TypeScript**: `^5` - Use TypeScript 5 features
- **OpenAI SDK**: `^5.20.3` - Use OpenAI v5 API patterns
- **Anthropic SDK**: `^0.63.0` - Use current Anthropic SDK patterns
- **json-rules-engine**: `^7.3.1` - Use v7 API for workflow rules
- **react-md-editor**: `@uiw/react-md-editor@^4.0.8` - Use v4 API
- **Mermaid**: `^11.12.0` - Use Mermaid v11 syntax
- **Testing Libraries**: `@testing-library/react@^16.3.0`, `jest@^30.1.3`

**Before Adding New Packages:**
1. **Version Check**: Review `package.json` for exact versions FIRST
2. **API Compatibility**: Ensure code examples match the installed versions
3. **Dependency Conflicts**: Verify compatibility with current versions (especially Zod v4, React 19, MUI v7)
4. **Bundle Size**: Consider impact for embedded contexts
5. **Peer Dependencies**: Use `npm install --legacy-peer-deps` if needed
6. **Documentation**: Update this list when adding major new dependencies

**Code Recommendation Rules:**
- Always check `package.json` before suggesting imports or API usage
- Use version-specific documentation and examples
- Test code suggestions against installed versions
- Flag potential version conflicts in recommendations
- Flag potential IP infringements

## Code Quality Requirements

### Testing Standards
- **90% minimum code coverage required**
- Write tests for all components, utilities, and API routes
- Test both standalone and embedded behavior
- Include integration tests for PostgreSQL interactions

### TypeScript Configuration
- Strict mode enabled - handle all type errors
- Use ES2017 target for broad compatibility
- Prefer explicit typing over `any`

## Migration Context

### Rails Integration Points
- Design APIs that can be consumed by both Rails and Next.js
- Use JWT tokens compatible with existing Rails authentication
- Maintain consistent data models between Rails and MongoDBand PostgreSQL schemas
- Plan for gradual feature migration - build components that can replace Rails views

### Session Management
- Implement JWT-based authentication
- Ensure token compatibility with Rails backend
- Handle both embedded and standalone authentication flows

## Development Guidelines


### Responsiveness Requirement
- All screens in the application must be responsive and handle phone, tablet, and computer screen configurations.

### Component Development
1. **Check existing code first**: Scan `src/app/components/`, `src/app/utils/`, `src/app/validators/`, and `src/app/types/` for reusable code
2. **Version-specific development**: Always check `package.json` for exact versions before writing code - use version-specific APIs and patterns
3. **Check package.json**: Review existing dependencies before adding new packages with similar functionality
4. Start with MUI v7 components as the foundation
5. Use Tailwind v4 for creating styled components and layout and spacing adjustments
6. Place reusable components in `src/app/components/`
7. Extract form validators to `src/app/validators/` (use Zod v4 API)
8. Define TypeScript types in `src/app/types/`
9. Ensure components work in embedded contexts
10. For workflow components: Build and update workflow components using the AI chat functionality.
11. **CRITICAL: Always validate and update existing test cases** - When creating or updating any component, check `src/test/` for existing test files and update them to match new functionality. Create comprehensive tests if none exist.
12. Write comprehensive tests in `src/test/` mirroring source structure using current testing library versions

### Database Integration
- Use PostgreSQL and MongoDB with connection pooling
- Design schemas that align with existing Rails models
- Plan for data migration scenarios

### Performance Considerations
- Leverage Turbopack for development speed
- Optimize for embedded loading performance
- Consider bundle size impact on parent pages

## User Stories and Epic Management

### Story Organization
- Store all user stories and epics in `user-stories/` folder in project root (outside `src/`)
- Use consistent naming: `epic-[name].md` for epics, `story-[name].md` for user stories.
- Link child stories to parent epics for traceability

### User Story Template
```markdown
# User Story: [Title]

**As a** [user type]  
**I want** [functionality]  
**So that** [benefit/value]

## Summary
[One-line summary of functionality]

## Feature 
[Name of feature this story belongs to]
[if the feature does not exist in the user-stories/ folder, omit this section]

## Epic
[Epic name if this story is part of an epic - link to epic file]
[if the epic does not exist in the user-stories/ folder, omit this section]

## UI Considerations
[UI/UX requirements, accessibility, responsiveness, or design notes]

## Acceptance Criteria
- [ ] [Specific, testable criteria]
- [ ] [Additional criteria]

## Developer Notes
[Notes added during development - implementation details, decisions, blockers]

### Security Notes
[Any security considerations, authentication requirements, data protection measures, or vulnerability mitigation strategies specific to this story]
```

**Instructions:**
- Omit the "Epic" section if there are no epics in the `user-stories/` folder to reference.
- Always include a "UI Considerations" section before "Acceptance Criteria" in every user story if applicable.



## Critical Files
- `src/app/layout.tsx` - Main layout with font loading and metadata
- `src/app/globals.css` - Tailwind imports and CSS variables
- `next.config.ts` - Next.js configuration (currently minimal)
- `package.json` - Dependencies and build scripts (CHECK BEFORE ADDING NEW PACKAGES)
- `user-stories/` - User stories and epics (outside src folder)
- `ai-implementation-summaries/` - AI implementation notes and summaries (outside src folder)
