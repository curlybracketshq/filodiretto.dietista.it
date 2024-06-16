import json
from common import auth
from common import cors
from common import errors
from common import db
from common import logging

print('Loading function')


@cors.access_control(methods={'GET', 'PUT', 'POST', 'DELETE'})
@errors.notify_discord
@logging.log_event
@auth.require_auth
def lambda_handler(event, context):
    if event['httpMethod'] == 'GET':
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param"}

        result = db.get_sender(event['queryStringParameters']['from'])

        if 'Item' not in result:
            return {"statusCode": 404, "body": "Item not found"}
        
        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'DELETE':
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param"}

        result = db.delete_sender(event['queryStringParameters']['from'])
        
        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'PUT':
        body = json.loads(event['body'])

        kwargs = {
            'number': body['conversation']['from'],
        }

        if 'weights' in body['conversation']:
            kwargs['weights'] = body['conversation']['weights']
        elif 'waist_hips' in body['conversation']:
            kwargs['waist_hips'] = body['conversation']['waist_hips']
        else:
            kwargs['first_name'] = body['conversation'].get('first_name', '')
            kwargs['last_name'] = body['conversation'].get('last_name', '')
            kwargs['email'] = body['conversation'].get('email', '')
            kwargs['height'] = body['conversation'].get('height', '')
            kwargs['birth_date'] = body['conversation'].get('birth_date', '')
            kwargs['gender'] = body['conversation'].get('gender', '')
            kwargs['notes'] = body['conversation'].get('notes', '')
            kwargs['privacy'] = body['conversation'].get('privacy', '')

        result = db.update_sender(**kwargs)

        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'POST':
        body = json.loads(event['body'])

        result = db.put_sender(
            body['conversation']['from'],
            body['conversation'].get('first_name', ''),
            body['conversation'].get('last_name', ''),
            body['conversation'].get('email', ''),
            body['conversation'].get('height', ''),
            body['conversation'].get('birth_date', ''),
            body['conversation'].get('gender', ''),
            body['conversation'].get('notes', ''),
            body['conversation'].get('privacy', ''),
        )

        return {"statusCode": 200, "body": json.dumps(result)}
    else:
        return {"statusCode": 405, "body": "Method not allowed"}
