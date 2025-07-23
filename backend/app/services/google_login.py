import os
import logging
import httpx
from typing import Dict, Optional
from dotenv import load_dotenv
from dotenv import load_dotenv, find_dotenv
import os



# Load environment variables
load_dotenv(find_dotenv())

# Configure logging
logger = logging.getLogger(__name__)


class GoogleOAuthService:
    
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        
        if not self.client_id or not self.client_secret:
            raise ValueError("Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file")
    
    async def exchange_code_for_tokens(self, authorization_code: str, redirect_uri: str) -> Dict:
        
        token_url = "https://oauth2.googleapis.com/token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": authorization_code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(token_url, data=data)
                response.raise_for_status()
                
                tokens = response.json()
                logger.info("Successfully exchanged authorization code for tokens")
                return tokens
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Failed to exchange code for tokens: {e.response.text}")
                raise Exception(f"Token exchange failed: {e.response.status_code}")
            except Exception as e:
                logger.error(f"Error during token exchange: {str(e)}")
                raise Exception(f"Token exchange error: {str(e)}")
    
    async def get_user_info(self, access_token: str) -> Dict:
        
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(user_info_url, headers=headers)
                response.raise_for_status()
                
                user_info = response.json()
                logger.info(f"Successfully retrieved user info for user: {user_info.get('email')}")
                return user_info
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Failed to get user info: {e.response.text}")
                raise Exception(f"User info retrieval failed: {e.response.status_code}")
            except Exception as e:
                logger.error(f"Error getting user info: {str(e)}")
                raise Exception(f"User info error: {str(e)}")
    

    async def authenticate_user(self, authorization_code: str, redirect_uri: str) -> Dict:
        """
        Complete Google OAuth flow: exchange code for tokens and get user info
        
        Args:
            authorization_code: The authorization code from Google
            redirect_uri: The redirect URI used in OAuth flow
            
        Returns:
            Dict containing user information and authentication status
        """
        try:
            # Step 1: Exchange authorization code for tokens
            tokens = await self.exchange_code_for_tokens(authorization_code, redirect_uri)
            access_token = tokens.get("access_token")
            
            if not access_token:
                raise Exception("No access token received from Google")
            
            # Step 2: Get user information
            user_info = await self.get_user_info(access_token)
            
            # Step 3: Format user data for your application
            user_data = {
                "google_id": user_info.get("id"),
                "email": user_info.get("email"),
                "name": user_info.get("name"),
                "first_name": user_info.get("given_name"),
                "last_name": user_info.get("family_name"),
                "picture": user_info.get("picture"),
                "verified_email": user_info.get("verified_email", False)
            }
            
            logger.info(f"Successfully authenticated Google user: {user_data['email']}")
            
            return {
                "success": True,
                "user": user_data,
                "tokens": tokens  # Include tokens if you need to store refresh token
            }
            
        except Exception as e:
            logger.error(f"Google authentication failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

# Global instance for reuse
google_oauth_service = GoogleOAuthService()

# Convenience function for easy importing
async def authenticate_google_user(authorization_code: str, redirect_uri: str) -> Dict:
    """
    Convenience function to authenticate a user with Google OAuth
    
    Args:
        authorization_code: The authorization code from Google OAuth callback
        redirect_uri: The redirect URI used in the OAuth flow
        
    Returns:
        Dict with authentication result and user data
    """
    return await google_oauth_service.authenticate_user(authorization_code, redirect_uri)



from ..models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def find_or_create_user(db_session: AsyncSession, user_data: dict) -> User:

    #so either way, this function retruns a User model, from what we gain from the Google
    """
    Find an existing user by email or google_id, or create a new one
    """
    # First try to find by google_id
    stmt = select(User).where(User.google_id == user_data.get("google_id"))
    result = await db_session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user:
        # Update user info with latest data from Google
        user.name = user_data.get("name")
        user.first_name = user_data.get("first_name")
        user.last_name = user_data.get("last_name")
        user.picture = user_data.get("picture")
        user.verified_email = user_data.get("verified_email", False)
        await db_session.commit()
        await db_session.refresh(user)
        return user
    
    # If not found by google_id, try to find by email
    stmt = select(User).where(User.email == user_data.get("email"))
    result = await db_session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user:
        # Link existing user account to Google
        user.google_id = user_data.get("google_id")
        user.name = user_data.get("name")
        user.first_name = user_data.get("first_name")
        user.last_name = user_data.get("last_name")
        user.picture = user_data.get("picture")
        user.verified_email = user_data.get("verified_email", False)
        await db_session.commit()
        await db_session.refresh(user)
        return user
    
    # Create new user
    new_user = User(
        email=user_data.get("email"),
        google_id=user_data.get("google_id"),
        name=user_data.get("name"),
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        picture=user_data.get("picture"),
        verified_email=user_data.get("verified_email", False),
        is_active=True
    )
    
    db_session.add(new_user)
    await db_session.commit()
    await db_session.refresh(new_user)
    return new_user



