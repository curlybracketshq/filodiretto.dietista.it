import boto3
import json
from datetime import datetime, timezone
import uuid

MESSAGES_TABLE = "filoDirettoMessages"
APPOINTMENTS_TABLE = "filoDirettoAppointments"


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

def get_appointment(number, timestamp):
    dynamodb = boto3.client('dynamodb')
    return dynamodb.get_item(
        TableName=APPOINTMENTS_TABLE,
        Key={
            'from': {'S': number},
            'datetime': {'S': timestamp},
        },
    )

def delete_appointment(number, timestamp):
    dynamodb = boto3.client('dynamodb')
    return dynamodb.delete_item(
        TableName=APPOINTMENTS_TABLE,
        Key={
            'from': {'S': number},
            'datetime': {'S': timestamp},
        },
    )

def update_appointment(number, timestamp, new_timestamp):
    dynamodb = boto3.client('dynamodb')
    # TODO: delete + update in a transaction
    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/transact_write_items.html
    # https://stackoverflow.com/questions/55474664/dynamoddb-how-to-update-sort-key
    # https://stackoverflow.com/questions/56709500/dynamodb-update-an-attribute-used-as-sort-key
    result = dynamodb.delete_item(
        TableName=APPOINTMENTS_TABLE,
        Key={
            'from': {'S': number},
            'datetime': {'S': timestamp},
        }
    )
    return dynamodb.put_item(
        TableName=APPOINTMENTS_TABLE,
        Item={
            'from': {'S': number},
            'datetime': {'S': new_timestamp},
        },
        ExpressionAttributeNames={
            '#F': 'from',
        },
        ConditionExpression='attribute_not_exists(#F)',
    )

def put_appointment(number, timestamp, year_month, type, reminder_sent_at):
    dynamodb = boto3.client('dynamodb')

    item = {
        'from': {'S': number},
        'datetime': {'S': timestamp},
        # Format: YYYY-MM
        # Used as the primary key of the `month-datetime-index` GSI
        'month': {'S': year_month},
        'type': {'S': type},
    }

    if reminder_sent_at is not None:
        item['reminderSentAt'] = {'S': reminder_sent_at}

    # Add a new appointment conditionally so we don't overwrite existing items
    return dynamodb.put_item(
        TableName=APPOINTMENTS_TABLE,
        Item=item,
        ExpressionAttributeNames={
            '#F': 'from',
        },
        ConditionExpression='attribute_not_exists(#F)',
    )

def query_appointments(number=None, month=None, before=None, after=None, exclusive_start_key=None):
    dynamodb = boto3.client('dynamodb')

    kwargs = {'TableName': APPOINTMENTS_TABLE}

    if exclusive_start_key is not None:
        kwargs['ExclusiveStartKey'] = exclusive_start_key

    if number is not None:
        kwargs['ExpressionAttributeValues'] = {':f': {'S': number}}
        kwargs['ExpressionAttributeNames'] = {'#F': 'from'}
        kwargs['KeyConditionExpression'] = '#F = :f'
        return dynamodb.query(**kwargs)
    elif month is not None and before is not None and after is not None:
        kwargs['ExpressionAttributeValues'] = {
            ':month': {'S': month},
            ':before': {'S': before},
            ':after': {'S': after},
        }
        kwargs['ExpressionAttributeNames'] = {'#M': 'month', '#D': 'datetime'}
        kwargs['KeyConditionExpression'] = '#M = :month AND #D BETWEEN :after AND :before'
        kwargs['IndexName'] = 'month-datetime-index'
        return dynamodb.query(**kwargs)
    else:
        return dynamodb.scan(**kwargs)