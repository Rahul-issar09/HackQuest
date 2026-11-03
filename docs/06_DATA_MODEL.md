# 6. Data Model

Use typed TypeScript interfaces, Zod schemas and Mongoose schemas (or the official MongoDB driver consistently). MongoDB is the source of truth. Use ObjectId identifiers internally and serialize IDs as strings in API DTOs. All records need createdAt and updatedAt where applicable. Store dates as BSON Date values in MongoDB and serialize them as ISO strings at API boundaries; document the convention.

## 6.1 Entities

### Settings
- id
- preparationStartDate
- examDate
- dailyStudyTargetMinutes
- primaryDifficulty (default: intermediate)
- theme
- schemaVersion
- createdAt
- updatedAt

### RoadmapDay
- id
- dayNumber
- date
- title
- domain
- summary
- objectives: string[]
- estimatedMinutes
- relevanceClassification
- topics: string[]
- order
- isRestOrRevisionDay
- createdAt
- updatedAt

### LearningTask
- id
- roadmapDayId
- title
- description
- taskType (theory, resource, lab, CTF, revision, report)
- resourceIds: string[]
- estimatedMinutes
- status (todo, in_progress, completed, skipped)
- completedAt
- notes
- order
- createdAt
- updatedAt

### Resource
- id
- title
- description
- url
- category
- resourceType
- difficulty
- costStatus (free, paid, mixed, unknown)
- relevanceClassification
- tags: string[]
- linkedRoadmapDayIds: string[]
- isFavourite
- status (not_started, in_progress, completed)
- personalNotes
- createdAt
- updatedAt

### Challenge
- id
- title
- platform
- url
- description
- category
- difficulty
- tags: string[]
- relevanceClassification
- linkedRoadmapDayIds: string[]
- isArchived
- createdAt
- updatedAt

### ChallengeAttempt
- id
- challengeId
- attemptedAt
- status (attempted, solved, failed, skipped)
- durationMinutes
- attemptNumber
- hintsUsed
- scoreAwarded (optional user-entered)
- pointsAvailable (optional user-entered)
- lessonsLearned
- notes
- createdAt
- updatedAt

### MockSession
- id
- title
- scheduledAt
- durationMinutes
- status (planned, active, completed, abandoned)
- challengeIds: string[]
- startedAt
- endedAt
- score
- pointsAvailable
- selfReview
- createdAt
- updatedAt

### MockChallengeResult
- id
- mockSessionId
- challengeId
- status
- startedAt
- completedAt
- pointsAwarded
- notes

### NoteFolder
- id
- name
- parentFolderId (nullable)
- order
- createdAt
- updatedAt

### Note
- id
- title
- markdownBody
- folderId (nullable)
- tags: string[]
- isPinned
- isFavourite
- linkedRoadmapDayIds: string[]
- linkedChallengeIds: string[]
- linkedResourceIds: string[]
- linkedMockSessionIds: string[]
- attachmentIds: string[]
- createdAt
- updatedAt
- lastSavedAt

### Attachment
- id
- noteId
- fileName
- mimeType
- sizeBytes
- blob/reference
- createdAt

### PracticeReport
- id
- title
- challengeId (nullable)
- attemptId (nullable)
- category
- difficulty
- objective
- initialObservations
- toolsUsed: string[]
- methodologyMarkdown
- findings
- flagRetrievalExplanation
- conclusion
- evidenceAttachmentIds: string[]
- createdAt
- updatedAt

### StudySession
- id
- startedAt
- endedAt
- durationMinutes
- linkedRoadmapDayId (nullable)
- linkedTaskId (nullable)
- notes

### RevisionItem
- id
- title
- sourceType (challenge, topic, note, resource)
- sourceId
- dueDate
- priority
- status (pending, completed, dismissed)
- reason
- createdAt
- updatedAt

## 6.2 Relationships

- RoadmapDay 1 -> many LearningTasks.
- Resource many <-> many RoadmapDays.
- Challenge 1 -> many ChallengeAttempts.
- MockSession many <-> many Challenges through MockChallengeResult.
- NoteFolder parent-child hierarchy.
- Note optionally links to many roadmap days, challenges, resources and mock sessions.
- PracticeReport optionally links to a challenge and attempt.
- RevisionItem points to a source record.

## 6.3 Derived metrics

Define all calculations in a central analytics module.

- Task completion = completed required tasks / total required tasks.
- Challenge solve rate = solved attempts / completed attempts (define treatment of skipped separately).
- First-attempt solve rate = challenges solved on first recorded attempt / challenges with at least one completed attempt.
- Category performance = category solved attempts / category completed attempts.
- Average solve time = mean duration for attempts with duration recorded; optionally show median too.
- Domain coverage = number of domains with at least one recorded attempt / configured domains.
- Readiness score = weighted component score from PRD, with transparent handling of missing data.

Do not treat missing data as zero skill. Show "not assessed" where no evidence exists. Do not double-count challenge retries as unique challenges when calculating unique challenge coverage.

## 6.4 Indexes

Index:
- RoadmapDay.date and dayNumber.
- LearningTask.roadmapDayId and status.
- Resource.category and title.
- Challenge.category and difficulty.
- ChallengeAttempt.challengeId and attemptedAt.
- Note.folderId, updatedAt, isPinned.
- RevisionItem.dueDate and status.

For note full-text search, implement a practical local search strategy and document limitations.


## 6.5 MongoDB collection implementation notes

Recommended collection names:
- `settings`
- `roadmapDays`
- `learningTasks`
- `resources`
- `challenges`
- `challengeAttempts`
- `mockSessions`
- `mockChallengeResults`
- `noteFolders`
- `notes`
- `attachments`
- `practiceReports`
- `studySessions`
- `revisionItems`

Implementation requirements:
- Define a Mongoose schema/model for each persisted entity, or document the equivalent collection validators when using the native driver.
- Use `timestamps: true` (or equivalent) for created/updated timestamps.
- Add unique indexes where appropriate (for example, roadmap day number/date and singleton settings record).
- Add indexes for foreign-key references and frequently used filters/sorts.
- Store references as MongoDB ObjectIds; validate referenced records before linking them.
- Use pagination for potentially large collections.
- Never accept raw client-supplied MongoDB filters, update operators or aggregation pipelines.
- Keep seed scripts idempotent and safe to rerun.
- Implement a migration/version strategy for schema changes.
- Use transactions for multi-document operations when the deployment supports them; handle unsupported transaction environments without corrupting data.
- Keep MongoDB access exclusively in server-side repositories/services.
- Configure environment variables through `.env.local`; commit only `.env.example` with placeholder values.
