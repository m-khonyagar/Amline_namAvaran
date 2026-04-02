import jwt
import bcrypt
import os
import random
import string
from datetime import datetime, timedelta

def generate_jwt(user_id: str, secret_key: str, expiration_minutes: int = 60) -> str:
    expiration = datetime.utcnow() + timedelta(minutes=expiration_minutes)
    token = jwt.encode({'user_id': user_id, 'exp': expiration}, secret_key, algorithm='HS256')
    return token

def verify_jwt(token: str, secret_key: str) -> dict:
    try:
        decoded = jwt.decode(token, secret_key, algorithms=['HS256'])
        return decoded
    except jwt.ExpiredSignatureError:
        return {'error': 'Token has expired'}
    except jwt.InvalidTokenError:
        return {'error': 'Invalid token'}

def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

# Example usage:
# secret = os.environ.get('JWT_SECRET_KEY')
# token = generate_jwt('user123', secret)
# print('Generated Token:', token)
# decoded_info = verify_jwt(token, secret)
# print('Decoded info:', decoded_info)