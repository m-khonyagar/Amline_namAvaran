from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.post("/send-otp")
async def send_otp(phone_number: str):
    # Logic to send OTP to the provided phone number
    return {"message": "OTP sent successfully."}


@router.post("/verify-otp")
async def verify_otp(phone_number: str, otp: str):
    # Logic to verify the OTP
    return {"message": "OTP verified successfully."}


@router.post("/refresh-token")
async def refresh_token(token: str):
    # Logic to refresh access token
    return {"access_token": "new_token", "token_type": "bearer"}


@router.get("/current-user")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    # Logic to get the current user information based on the token
    return {"user": {"username": "example_user"}}
