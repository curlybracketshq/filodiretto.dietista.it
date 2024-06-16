import json
from common import auth
from common import cors
from common import errors
from common import db
from common import logging

print('Loading function')


@cors.access_control(methods={'GET'})
@errors.notify_discord
@logging.log_event
@auth.require_auth
def lambda_handler(event, context):
    if event['httpMethod'] != 'GET':
        return {"statusCode": 405, "body": "Method not allowed"}
    
    if 'from' not in event['queryStringParameters']:
        return {"statusCode": 400, "body": "Missing from param"}

    results = db.query_next_appointment(event['queryStringParameters']['from'])
    
    return {"statusCode": 200, "body": json.dumps(results)}
