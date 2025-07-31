# backend/app/services/google_login.py

import httpx
import logging
from typing import Dict, Optional
from urllib.parse import urlencode
import os

logger = logging.getLogger(__name__)

class GoogleOAuthService:
    """
    Service class for handling Google OAuth authentication
    """
    
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict:
        """
        Exchange authorization code for access token and refresh token
        """
        token_data = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.token_url, data=token_data)
            response.raise_for_status()
            return response.json()
    
    async def get_user_info(self, access_token: str) -> Dict:
        """
        Get user information from Google using the access token
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.userinfo_url, headers=headers)
            response.raise_for_status()
            return response.json()
    
    async def authenticate_user(self, authorization_code: str, redirect_uri: str) -> Dict:
        """
        Complete OAuth flow: exchange code for tokens and get user info
        
        Args:
            authorization_code: The authorization code from Google OAuth callback
            redirect_uri: The redirect URI used in the OAuth flow
            
        Returns:
            Dict with authentication result and user data
        """
        try:
            # Exchange code for tokens
            tokens = await self.exchange_code_for_tokens(authorization_code, redirect_uri)
            
            # Get user info using the access token
            user_info = await self.get_user_info(tokens["access_token"])
            
            # Format user data for our application
            user_data = {
                "email": user_info.get("email"),
                "google_id": user_info.get("id"),
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