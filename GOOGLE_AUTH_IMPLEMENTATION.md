# Google Authentication Implementation

This document describes the Google OAuth authentication system that has been added to your chatbot application.

## 🚀 What Was Implemented

### 1. Database Setup (`backend/app/database/session.py`)
- **Async SQLAlchemy session management** with proper dependency injection
- **Automatic table creation** on application startup
- **SQLite database** (configurable via `DATABASE_URL` environment variable)

### 2. Updated User Model (`backend/app/models/user.py`)
- **Google OAuth fields**: `google_id`, `name`, `first_name`, `last_name`, `picture`
- **Flexible authentication**: Supports both Google OAuth and traditional auth
- **Timestamps**: Automatic `created_at` and `updated_at` tracking
- **Email verification**: Tracks Google's email verification status

### 3. Find or Create User Function (`backend/app/routers/google_login_router.py`)
The `find_or_create_user` function implements smart user management:
- **Finds existing users** by Google ID or email
- **Creates new users** if none found
- **Links Google accounts** to existing email-based accounts
- **Updates user info** with latest data from Google

### 4. Google Login Router (`backend/app/routers/google_login_router.py`)
- **Complete OAuth flow**: Handles authorization code exchange
- **JWT token creation**: Secure session management
- **HTTP-only cookies**: Secure token storage
- **Error handling**: Comprehensive error responses

### 5. Dependencies Added (`backend/requirements.txt`)
```
sqlalchemy
asyncpg
aiosqlite
alembic
python-jose[cryptography]
```

## 🔧 Environment Variables Required

Make sure your `.env` file contains:
```bash
# Google OAuth (both needed)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5173/google-callback"

# JWT Configuration
JWT_SECRET="your-secret-key"
JWT_ALGORITHM="HS256"
```

## 🎯 How It Works

### 1. User Flow
1. User clicks "Login with Google" on frontend
2. Redirected to Google OAuth consent screen
3. Google redirects back with authorization code
4. Frontend sends code to `/api/auth/google` endpoint
5. Backend exchanges code for user info
6. User is found/created in database
7. JWT token is issued and stored in HTTP-only cookie

### 2. Database Logic
```python
async def find_or_create_user(db_session: AsyncSession, user_data: dict) -> User:
    # Try to find by google_id first
    user = await find_by_google_id(user_data["google_id"])
    if user:
        # Update existing user info
        return update_user_info(user, user_data)
    
    # Try to find by email
    user = await find_by_email(user_data["email"])
    if user:
        # Link Google account to existing user
        return link_google_account(user, user_data)
    
    # Create new user
    return create_new_user(user_data)
```

## 🔌 API Endpoint

### POST `/api/auth/google`
Handles Google OAuth callback.

**Request Body:**
```json
{
  "code": "authorization_code_from_google"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "picture": "https://..."
  }
}
```

**Sets HTTP-only cookie:** `session_token` with JWT

## 🧪 Testing

The implementation has been tested and verified to:
- ✅ Create database tables automatically
- ✅ Handle new user creation
- ✅ Find existing users correctly
- ✅ Update user information
- ✅ Link Google accounts to existing emails
- ✅ Generate secure JWT tokens

## 🚦 Running the Application

To start the application with Google authentication:

```bash
# Make sure your .env file has the required variables
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The database will be created automatically on startup, and the Google authentication endpoint will be available at `http://localhost:8000/api/auth/google`.

## 🔐 Security Features

- **HTTP-only cookies**: Prevents XSS attacks
- **Secure flag**: HTTPS-only in production
- **SameSite protection**: CSRF protection
- **JWT expiration**: 31-day token lifetime
- **Email verification**: Uses Google's verification status

## 📝 Notes

- The implementation preserves your existing code logic
- Database sessions are properly managed with async context
- All Google OAuth fields are optional for backward compatibility
- The system gracefully handles both new and returning users 