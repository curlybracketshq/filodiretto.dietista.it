import json
import hashlib
import os

SECRET = os.environ['AUTH_SECRET'].encode('utf-8')


def _is_token_valid(token):
    print(token)
    m = hashlib.sha256()
    m.update(token['timestamp'].encode('utf-8'))
    m.update(token['nonce'].encode('utf-8'))
    m.update(SECRET)
    signature = m.hexdigest()
    return signature == token['signature']


def require_auth(f):
    def new_f(event, context):
        token = None
        if 'token' in event.get('queryStringParameters', {}):
            token = json.loads(event['queryStringParameters']['token'])

        if token is None:
            body = json.loads(event['body'])
            if 'token' in body:
                token = json.loads(body['token'])

        if token is None:
            return {'statusCode': 400, 'body': 'Missing token'}

        if not _is_token_valid(token):
            return {'statusCode': 401, 'body': 'Authentication failed'}

        return f(event, context)
    return new_f
