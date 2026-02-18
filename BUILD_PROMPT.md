# DocuMaster Pro - Build Instructions

Build a complete multi-tenant Document Management System with the following specifications:

## TECH STACK
- Backend: Node.js + Express + MongoDB
- Frontend: React 18 + Vite + Tailwind CSS
- Tests: Jest (backend), Vitest (frontend)
- Database: MongoDB with multi-tenant support

## PROJECT STRUCTURE

### Backend (/backend)
```
backend/
├── src/
│   ├── app.js                    # Express app entry
│   ├── config/
│   │   ├── database.js           # Multi-tenant MongoDB connection
│   │   └── auth.js               # JWT configuration
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   ├── company.js            # Extract x-company-name header, switch DB
│   │   ├── upload.js             # Multer file upload
│   │   └── errorHandler.js       # Error handling
│   ├── models/
│   │   ├── User.js               # dm_users collection
│   │   ├── Document.js           # dm_documents collection
│   │   ├── Contract.js           # dm_contracts collection
│   │   ├── Template.js           # dm_templates collection
│   │   ├── Folder.js             # dm_folders collection
│   │   └── AuditLog.js           # dm_audit_logs collection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── documentController.js
│   │   ├── contractController.js
│   │   ├── templateController.js
│   │   └── folderController.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── documents.js
│   │   ├── contracts.js
│   │   ├── templates.js
│   │   └── folders.js
│   └── services/                 # Business logic
├── tests/
│   ├── setup.js
│   ├── auth.test.js
│   ├── users.test.js
│   └── documents.test.js
├── uploads/
├── .env
└── package.json
```

### Frontend (/frontend)
```
frontend/
├── index.html
├── vite.config.js
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── common/
│   │   │   ├── Layout.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── DataTable.jsx
│   │   ├── documents/
│   │   │   ├── DocumentList.jsx
│   │   │   ├── DocumentCard.jsx
│   │   │   └── DocumentUpload.jsx
│   │   ├── contracts/
│   │   │   └── ContractList.jsx
│   │   └── users/
│   │       └── UserList.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Documents.jsx
│   │   ├── Contracts.jsx
│   │   ├── Templates.jsx
│   │   ├── Users.jsx
│   │   └── Folders.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useApi.js
│   ├── context/
│   │   └── AuthContext.jsx
│   └── utils/
│       ├── api.js
│       └── constants.js
└── tests/
    ├── setup.js
    └── Login.test.jsx
```

## CRITICAL REQUIREMENTS

### 1. Multi-Tenant Architecture
- Read "x-company-name" header from requests
- Use header value as MongoDB database name
- Example: "x-company-name: testc2" → connect to "testc2" database
- ALL collections must be prefixed with "dm_"

### 2. MongoDB Collections (ALL dm_* prefix)
- dm_users: User accounts, roles, permissions
- dm_documents: Document metadata, files
- dm_contracts: Contracts, signatures, parties
- dm_templates: Document/contract templates
- dm_folders: Folder structure
- dm_audit_logs: Activity tracking

### 3. Backend APIs (must work for AI agents too)
Auth:
- POST /api/auth/login
- POST /api/auth/register
- PUT /api/auth/password

Users:
- GET /api/users
- POST /api/users
- PUT /api/users/:id/password
- DELETE /api/users/:id

Documents:
- GET /api/documents
- POST /api/documents
- GET /api/documents/:id/download
- PUT /api/documents/:id
- DELETE /api/documents/:id

Contracts:
- GET /api/contracts
- POST /api/contracts
- PUT /api/contracts/:id/sign

Templates:
- GET /api/templates
- POST /api/templates

Folders:
- GET /api/folders
- POST /api/folders

### 4. Environment Variables (.env)
NODE_ENV=development
PORT=3001
JWT_SECRET=documaster-secret-key
JWT_EXPIRES_IN=24h
MONGODB_URI=mongodb://localhost:27017
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=52428800

### 5. Design - Dark Theme
- Background: #0f172a (slate-900)
- Card: #1e293b (slate-800)
- Primary: #3b82f6 (blue-500)
- Accent: #8b5cf6 (violet-500)
- Text: #f8fafc (slate-50)

## BUILD PHASES

### Phase 1: Backend Foundation
1. Create package.json with all dependencies
2. Create .env file
3. Implement database.js with multi-tenant support
4. Create all Mongoose models
5. Implement auth middleware
6. Create all controllers
7. Set up all routes
8. Create app.js

### Phase 2: Frontend Foundation
1. Create package.json
2. Set up Vite configuration
3. Configure Tailwind CSS
4. Create base components
5. Set up routing
6. Create authentication context
7. Build Login page
8. Build Dashboard layout

### Phase 3: Core Features
1. Document upload/download
2. Folder management
3. User management UI
4. Document search
5. Contract templates

### Phase 4: Tests
1. Backend API tests (Jest)
2. Frontend component tests (Vitest)
3. Integration tests

## START BUILDING NOW

Begin with Phase 1 - Backend Foundation. Create all files systematically. Make sure all code is production-quality with proper error handling.

DO NOT STOP until all phases are complete.
