# backend/app/database/operations.py

import asyncpg
from datetime import datetime
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


async def find_or_create_user(
    connection: asyncpg.Connection,
    user_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Find an existing user by email or google_id, or create a new one.
    This is the main function for handling user authentication.
    
    Args:
        connection: AsyncPG database connection
        user_data: Dict containing user information from Google OAuth with keys:
            - email: User's email address
            - google_id: Google OAuth ID (optional)
            - name: Full name (optional)
            - first_name: First name (optional)
            - last_name: Last name (optional)
            - picture: Profile picture URL (optional)
            - verified_email: Email verification status (optional)
    
    Returns:
        Dict containing the user's data
    """
    # First try to find by google_id if provided
    if user_data.get("google_id"):
        query = """
            SELECT id, email, name, google_id, first_name, last_name, 
                   picture, is_active, verified_email, created_at, updated_at
            FROM users 
            WHERE google_id = $1
        """
        row = await connection.fetchrow(query, user_data.get("google_id"))
        
        if row:
            # Update user info with latest data from Google
            update_query = """
                UPDATE users 
                SET name = $2, first_name = $3, last_name = $4, 
                    picture = $5, verified_email = $6, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id, email, name, google_id, first_name, last_name, 
                          picture, is_active, verified_email, created_at, updated_at
            """
            updated_row = await connection.fetchrow(
                update_query,
                row['id'],
                user_data.get("name"),
                user_data.get("first_name"),
                user_data.get("last_name"),
                user_data.get("picture"),
                user_data.get("verified_email", False)
            )
            logger.info(f"Updated existing user with Google ID: {user_data.get('google_id')}")
            return dict(updated_row)
    
    # If not found by google_id, try to find by email
    email_query = """
        SELECT id, email, name, google_id, first_name, last_name, 
               picture, is_active, verified_email, created_at, updated_at
        FROM users 
        WHERE email = $1
    """
    row = await connection.fetchrow(email_query, user_data.get("email"))
    
    if row:
        # Link existing user account to Google
        update_query = """
            UPDATE users 
            SET google_id = $2, name = $3, first_name = $4, last_name = $5, 
                picture = $6, verified_email = $7, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, email, name, google_id, first_name, last_name, 
                      picture, is_active, verified_email, created_at, updated_at
        """
        updated_row = await connection.fetchrow(
            update_query,
            row['id'],
            user_data.get("google_id"),
            user_data.get("name"),
            user_data.get("first_name"),
            user_data.get("last_name"),
            user_data.get("picture"),
            user_data.get("verified_email", False)
        )
        logger.info(f"Linked Google account to existing user: {user_data.get('email')}")
        return dict(updated_row)
    
    # Create new user
    insert_query = """
        INSERT INTO users (
            email, google_id, name, first_name, last_name, 
            picture, verified_email, is_active
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, name, google_id, first_name, last_name, 
                  picture, is_active, verified_email, created_at, updated_at
    """
    
    new_row = await connection.fetchrow(
        insert_query,
        user_data.get("email"),
        user_data.get("google_id"),
        user_data.get("name"),
        user_data.get("first_name"),
        user_data.get("last_name"),
        user_data.get("picture"),
        user_data.get("verified_email", False),
        True  # is_active
    )
    
    logger.info(f"Created new user: {user_data.get('email')}")
    return dict(new_row)


async def find_or_create_user_traditional(
    connection: asyncpg.Connection,
    email: str,
    password: str
) -> Dict[str, Any]:
    """
    Find an existing user by email and verify password, or create a new one.
    This is the main function for traditional email/password authentication.
    
    Args:
        connection: AsyncPG database connection
        email: User's email address
        password: Plain text password (will be hashed if creating new user)
    
    Returns:
        Dict containing the user's data if authentication successful
        
    Raises:
        ValueError: If password is incorrect for existing user
    """
    from ..services.password_service import get_password_hash, verify_password
    
    # First try to find user by email
    email_query = """
        SELECT id, email, name, google_id, first_name, last_name, 
               picture, hashed_password, is_active, verified_email, 
               created_at, updated_at
        FROM users 
        WHERE email = $1
    """
    row = await connection.fetchrow(email_query, email)
    
    if row:
        user_data = dict(row)
        # User exists - verify password
        if not user_data.get('hashed_password'):
            raise ValueError("This account uses Google sign-in. Please use 'Sign in with Google'.")
        
        if not verify_password(password, user_data['hashed_password']):
            raise ValueError("Incorrect password")
        
        logger.info(f"User authenticated: {email}")
        return user_data
    
    # User doesn't exist - create new one
    hashed_password = get_password_hash(password)
    
    insert_query = """
        INSERT INTO users (email, hashed_password, is_active) 
        VALUES ($1, $2, $3)
        RETURNING id, email, name, google_id, first_name, last_name, 
                  picture, is_active, verified_email, created_at, updated_at
    """
    
    new_row = await connection.fetchrow(
        insert_query,
        email,
        hashed_password,
        True  # is_active
    )
    
    logger.info(f"Created new user via traditional auth: {email}")
    return dict(new_row)


async def add_thread(
    connection: asyncpg.Connection,
    thread_id: str,
    user_id: int,
    thread_name: str
) -> Dict[str, Any]:
    """
    Add a new thread to the threads table.
    
    Args:
        connection: AsyncPG database connection
        thread_id: Unique thread identifier
        user_id: ID of the user who owns the thread
        thread_name: Name/title of the thread
        
    Returns:
        Dict containing the created thread's data
        
    Raises:
        asyncpg.UniqueViolationError: If thread_id already exists
        asyncpg.ForeignKeyViolationError: If user_id doesn't exist
    """
    try:
        query = """
            INSERT INTO threads (thread_id, user_id, thread_name)
            VALUES ($1, $2, $3)
            RETURNING thread_id, user_id, thread_name, created_at, updated_at
        """
        
        row = await connection.fetchrow(query, thread_id, user_id, thread_name)
        
        thread_data = dict(row)
        logger.info(f"Successfully created thread: {thread_data['thread_id']} for user: {user_id}")
        return thread_data
        
    except asyncpg.UniqueViolationError as e:
        logger.error(f"Thread with ID {thread_id} already exists: {e}")
        raise
    except asyncpg.ForeignKeyViolationError as e:
        logger.error(f"User with ID {user_id} does not exist: {e}")
        raise
    except Exception as e:
        logger.error(f"Error creating thread: {e}")
        raise


# Helper functions for common queries

async def get_user_by_email(
    connection: asyncpg.Connection,
    email: str
) -> Optional[Dict[str, Any]]:
    """
    Get a user by their email address.
    
    Args:
        connection: AsyncPG database connection
        email: User's email address
        
    Returns:
        User data as dict or None if not found
    """
    query = """
        SELECT id, email, name, google_id, first_name, last_name, 
               picture, hashed_password, is_active, verified_email, 
               created_at, updated_at
        FROM users 
        WHERE email = $1
    """
    
    row = await connection.fetchrow(query, email)
    return dict(row) if row else None


async def get_user_by_google_id(
    connection: asyncpg.Connection,
    google_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get a user by their Google ID.
    
    Args:
        connection: AsyncPG database connection
        google_id: User's Google ID
        
    Returns:
        User data as dict or None if not found
    """
    query = """
        SELECT id, email, name, google_id, first_name, last_name, 
               picture, is_active, verified_email, created_at, updated_at
        FROM users 
        WHERE google_id = $1
    """
    
    row = await connection.fetchrow(query, google_id)
    return dict(row) if row else None


async def get_user_by_id(
    connection: asyncpg.Connection,
    user_id: int
) -> Optional[Dict[str, Any]]:
    """
    Get a user by their ID.
    
    Args:
        connection: AsyncPG database connection
        user_id: User's ID
        
    Returns:
        User data as dict or None if not found
    """
    query = """
        SELECT id, email, name, google_id, first_name, last_name, 
               picture, hashed_password, is_active, verified_email, 
               created_at, updated_at
        FROM users 
        WHERE id = $1
    """
    
    row = await connection.fetchrow(query, user_id)
    return dict(row) if row else None


async def get_user_threads(
    connection: asyncpg.Connection,
    user_id: int,
    limit: Optional[int] = None
) -> list[Dict[str, Any]]:
    """
    Get threads for a specific user, optionally limited.
    
    Args:
        connection: AsyncPG database connection
        user_id: User's ID
        limit: Maximum number of threads to return (None for all)
        
    Returns:
        List of thread data dicts ordered by created_at DESC
    """
    query = """
        SELECT thread_id, user_id, thread_name, created_at, updated_at
        FROM threads 
        WHERE user_id = $1
        ORDER BY created_at DESC
    """
    
    if limit is not None:
        query += f" LIMIT {limit}"
    
    rows = await connection.fetch(query, user_id)
    return [dict(row) for row in rows]


async def check_thread_exists(
    connection: asyncpg.Connection,
    thread_id: str
) -> bool:
    """
    Check if a thread with the given ID exists.
    
    Args:
        connection: AsyncPG database connection
        thread_id: Thread ID to check
        
    Returns:
        True if thread exists, False otherwise
    """
    query = "SELECT EXISTS(SELECT 1 FROM threads WHERE thread_id = $1)"
    return await connection.fetchval(query, thread_id)


# Example: Create user with initial thread using transaction
async def create_user_with_initial_thread(
    connection: asyncpg.Connection,
    user_data: Dict[str, Any],
    thread_id: str,
    thread_name: str = "Welcome Thread"
) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Create a user and their initial thread in a single transaction.
    Uses find_or_create_user to handle the user creation.
    
    Args:
        connection: AsyncPG database connection
        user_data: User data dict (email, google_id, name, etc.)
        thread_id: Initial thread ID
        thread_name: Name for the initial thread
        
    Returns:
        Tuple of (user_data, thread_data)
    """
    async with connection.transaction():
        # Create or find user
        user = await find_or_create_user(connection, user_data)
        
        # Create initial thread
        thread_data = await add_thread(
            connection, 
            thread_id, 
            user['id'], 
            thread_name
        )
        
        return user, thread_data