import json
from datetime import datetime
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
        
        if 'datetime' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing datetime param"}
    
        result = db.get_appointment(
            event['queryStringParameters']['from'],
            event['queryStringParameters']['datetime'],
        )

        if 'Item' not in result:
            return {"statusCode": 404, "body": "Item not found"}
        
        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'DELETE':
        if 'from' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing from param"}
        
        if 'datetime' not in event['queryStringParameters']:
            return {"statusCode": 400, "body": "Missing datetime param"}

        result = db.delete_appointment(
            event['queryStringParameters']['from'],
            event['queryStringParameters']['datetime'],
        )
        
        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'PUT':
        body = json.loads(event['body'])

        result = db.update_appointment(
            body['appointment']['from'],
            body['appointment']['datetime'],
            body['appointment']['new_datetime'],
        )

        return {"statusCode": 200, "body": json.dumps(result)}
    elif event['httpMethod'] == 'POST':
        body = json.loads(event['body'])

        # Set reminder sent at now arbitrarily if the "reminder sent" checkbox
        # is marked
        if body['appointment']['reminder_sent']:
            reminder_sent_at = datetime.now().isoformat(timespec='minutes')
        else:
            reminder_sent_at = None

        result = db.put_appointment(
            body['appointment']['from'],
            body['appointment']['datetime'],
            # Take just the YYYY-MM part (first 7 chars) of the datetime value
            body['appointment']['datetime'][:7],
            body['appointment']['appointment_type'],
            reminder_sent_at,
        )

        return {"statusCode": 200, "body": json.dumps(result)}
    else:
        return {"statusCode": 405, "body": "Method not allowed"}
