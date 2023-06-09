import json
import hashlib
import hmac
import base64
import time
import binascii
import os

SECRET_KEY = os.environ['AUTH_SECRET']
TOKEN_TTL_SECS = 60 * 60 * 24 * 7


def generate_token(username, is_admin, timestamp):
    """Generates a token with a signature field."""
    message = f'{username}:{is_admin}:{timestamp}'.encode()
    signature = hmac.new(SECRET_KEY.encode(), message, hashlib.sha256).digest()
    token = base64.b64encode(message + signature).decode()
    return token


def _authenticate(token):
    """Validates the token and checks the signature field."""
    try:
        decoded_token = base64.b64decode(token.encode())
        message = decoded_token[:-32]  # Signature field is last 32 bytes
        signature = decoded_token[-32:]  # Last 32 bytes is the signature

        expected_signature = hmac.new(
            SECRET_KEY.encode(), message, hashlib.sha256
        ).digest()

        if hmac.compare_digest(signature, expected_signature):
            # Token is valid
            username, is_admin, timestamp = message.decode().split(':')
            current_timestamp = int(time.time())
            if current_timestamp - int(timestamp) <= TOKEN_TTL_SECS:
                return (True, {'username': username, 'is_admin': is_admin})
    except (binascii.Error, ValueError, TypeError) as e:
        print(e)
        pass
    
    return (False, None)


def require_auth(f):
    def new_f(event, context):
        token = None
        if event['queryStringParameters'] is not None:
            token = event['queryStringParameters'].get('token')

        if token is None:
            body = json.loads(event['body'])
            token = body.get('token')

        if token is None:
            return {'statusCode': 401, 'body': 'Authentication required'}

        authenticated, auth_context = _authenticate(token)
        if not authenticated:
            return {'statusCode': 401, 'body': 'Authentication failed'}

        context.client_context = {'auth': auth_context}
        return f(event, context)
    return new_f
