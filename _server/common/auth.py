import hashlib
import os

SECRET = os.environ['AUTH_SECRET'].encode('utf-8')


def is_token_valid(token):
    print(token)
    m = hashlib.sha256()
    m.update(token['timestamp'].encode('utf-8'))
    m.update(token['nonce'].encode('utf-8'))
    m.update(SECRET)
    signature = m.hexdigest()
    return signature == token['signature']