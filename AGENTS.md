# Repository Guidelines

## Project Structure & Module Organization

Single TypeScript library with algorithm-focused architecture:

```
interview-scheduling-engine/
├── src/
│   ├── algorithms/      # Core scheduling algorithms
│   ├── calendar/        # Calendar integration abstractions
│   ├── core/            # Engine and orchestration
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper utilities
├── examples/            # Working examples
└── docs/                # Algorithm documentation
```

**Published as:** Dual ESM + CJS npm package with full TypeScript support.

## Build, Test, and Development Commands

```bash
npm run build            # Build with tsup (ESM + CJS + types)
npm run dev              # Watch mode for development
npm run lint             # ESLint with TypeScript support
npm run typecheck        # Type checking without emit
npm run test             # Run Vitest tests
npm run test:watch       # Watch mode for tests
npm run clean            # Remove dist directory

# Run examples
npm run example:basic           # Basic single-day scheduling
npm run example:multi-day       # Multi-day optimization
npm run example:load-balancing  # Interviewer load balancing
```

## Coding Style & Naming Conventions

**TypeScript:**
- **ESLint:** Configured with `@typescript-eslint` for strict checking
- **Prettier:** Automatic code formatting
- **Interfaces/Types:** PascalCase (`SchedulingConstraints`, `InterviewerAvailability`, `OptimizationResult`)
- **Functions:** camelCase (`scheduleInterviews()`, `optimizeLoadBalance()`, `findAvailableSlots()`)
- **Files:** kebab-case (`constraint-solver.ts`, `load-balancer.ts`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_ITERATIONS`, `DEFAULT_TIMEZONE`)

**Patterns:**
- Functional programming for algorithms
- Immutable data structures preferred
- Pure functions for constraint checking

## Testing Guidelines

**Framework:** Vitest 1.1.0

**Running Tests:**
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm test -- --coverage    # Generate coverage report
```

**Test Structure:**
- Test files: `*.test.ts` alongside source files
- Focus on: Algorithm correctness, edge cases, timezone handling
- Use deterministic test data (avoid random dates)

**Naming:** `describe('BacktrackingScheduler') → it('should handle no solution case')`

## Commit & Pull Request Guidelines

**Commit Format:** Conventional Commits

```
feat(algorithms): add constraint satisfaction algorithm
fix(calendar): resolve timezone conversion bug
perf(backtracking): optimize pruning strategy
docs(examples): add multi-day scheduling example
test(load-balancer): add edge case tests
```

**Scopes:** `algorithms`, `calendar`, `core`, `types`, `utils`, `examples`, `docs`

**PR Requirements:**
- Link related issues
- Update algorithm documentation if logic changes
- Add test cases for new features
- Ensure `npm run lint` and `npm run typecheck` pass
- Update examples if public API changes

## Algorithm-Specific Guidelines

**Key Concepts:**
- **Constraint Satisfaction:** Schedule while respecting hard and soft constraints
- **Backtracking:** Explore solution space, prune invalid branches early
- **Load Balancing:** Distribute interviews evenly across interviewers
- **Timezone Handling:** All calculations in UTC, convert for display using date-fns-tz
- **Multi-Day Optimization:** Balance across multiple days while minimizing gaps

**Performance Considerations:**
- Early pruning in backtracking to reduce search space
- Caching availability checks for repeated queries
- Limit maximum iterations to prevent infinite loops

**Timezone Best Practices:**
```typescript
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

// Convert user input to UTC for storage
const utcDate = zonedTimeToUtc(userDate, userTimezone)

// Convert UTC to user timezone for display
const displayDate = utcToZonedTime(utcDate, userTimezone)
```

## Environment Setup

**Required:**
- Node.js >= 18.0.0
- npm >= 9.0.0

**Dependencies:**
- `date-fns` and `date-fns-tz` for timezone-aware date handling
- No external API dependencies

**Development:**
```bash
npm install
npm run build
npm run test
```

**Integration:**
- Works with Google Calendar, Outlook, or custom calendar providers
- Implement `CalendarProvider` interface for new integrations
