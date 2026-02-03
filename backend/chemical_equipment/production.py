"""
Production settings for chemical_equipment project.
"""

from .settings import *

# Security settings for production
DEBUG = False
ALLOWED_HOSTS = ['*']

# CORS settings for production
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ramiyaa-chemical.vercel.app",  # Replace with your Vercel URL
]

# Add your Vercel frontend URL here
