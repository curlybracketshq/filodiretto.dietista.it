import boto3
import json
from datetime import datetime, timezone
import uuid

MESSAGES_TABLE = "filoDirettoMessages"


def query_messages(number, limit=None, exclusive_start_key=None):
    dynamodb = boto3.client('dynamodb')

    kwargs = {
        'TableName': MESSAGES_TABLE,
        'ExpressionAttributeValues': {':f': {'S': number}},
        'ExpressionAttributeNames': {'#F': 'from'},
        'KeyConditionExpression': '#F = :f',
        'ScanIndexForward': False,
    }

    if limit is not None:
        kwargs['Limit'] = limit

    if exclusive_start_key is not None:
        kwargs['ExclusiveStartKey'] = exclusive_start_key

    return dynamodb.query(**kwargs)

def put_message(recipient, message):
    dynamodb = boto3.client('dynamodb')
    dynamodb.put_item(
        TableName=MESSAGES_TABLE,
        Item={
            # A bit confusing, but this is the primary key
            'from': {'S': recipient},
            'timestamp': {'S': str(int(datetime.now(timezone.utc).timestamp()))},
            'id': {'S': str(uuid.uuid4())},
            # Use the same format as Whatsapp messages for convenience
            'text': {'S': json.dumps({'body': message})},
            # Used to disambiguate messages send by the system
            'source': {'S': 'filodiretto'},
        },
    )