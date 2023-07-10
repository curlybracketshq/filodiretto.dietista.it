import boto3
import json
from datetime import datetime, timezone
import uuid

MESSAGES_TABLE = "filoDirettoMessages"
APPOINTMENTS_TABLE = "filoDirettoAppointments"
SENDERS_TABLE = "filoDirettoSenders"


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

def get_sender(number):
    dynamodb = boto3.client('dynamodb')
    return dynamodb.get_item(
        TableName=SENDERS_TABLE,
        Key={'from': {'S': number}},
    )

def delete_sender(number):
    dynamodb = boto3.client('dynamodb')
    return dynamodb.delete_item(
        TableName=SENDERS_TABLE,
        Key={'from': {'S': number}},
    )

def update_sender(
        number,
        weights=None,
        waist_hips=None,
        first_name=None,
        last_name=None,
        email=None,
        height=None,
        birth_date=None,
        gender=None,
        notes=None,
    ):
    dynamodb = boto3.client('dynamodb')
    kwargs = {
        'TableName': SENDERS_TABLE,
        'Key': {'from': {'S': number}},
        'ReturnValues': 'ALL_NEW',
        'ConditionExpression': '#F = :f',
    }

    if weights is not None:
        kwargs['ExpressionAttributeNames'] = {
            '#F': 'from',
            '#W': 'weights',
        }
        kwargs['ExpressionAttributeValues'] = {
            ':f': {'S': number},
            ':w': {'S': weights},
        }
        kwargs['UpdateExpression'] = 'SET #W = :w'
    elif waist_hips is not None:
        kwargs['ExpressionAttributeNames'] = {
            '#F': 'from',
            '#W': 'waistHips',
        }
        kwargs['ExpressionAttributeValues'] = {
            ':f': {'S': number},
            ':w': {'S': waist_hips},
        }
        kwargs['UpdateExpression'] = 'SET #W = :w'
    else:
        kwargs['ExpressionAttributeNames'] = {
            '#F': 'from',
            '#FN': 'firstName',
            '#LN': 'lastName',
            '#E': 'email',
            '#H': 'height',
            '#BD': 'birthDate',
            '#G': 'gender',
            '#N': 'notes',
        }
        kwargs['ExpressionAttributeValues'] = {
            ':f': {'S': number},
            ':fn': {'S': first_name},
            ':ln': {'S': last_name},
            ':e': {'S': email},
            ':h': {'N': height} if len(height) > 0 else {'NULL': True},
            ':bd': {'S': birth_date},
            ':g': {'S': gender},
            ':n': {'S': notes},
        }
        kwargs['UpdateExpression'] = 'SET #FN = :fn, #LN = :ln, #E = :e, #H = :h, #BD = :bd, #G = :g, #N = :n'

    return dynamodb.update_item(**kwargs)

def put_sender(
        number,
        first_name,
        last_name,
        email,
        height,
        birth_date,
        gender,
        notes,
    ):
    dynamodb = boto3.client('dynamodb')

    # Add a new sender conditionally so we don't overwrite existing items
    return dynamodb.put_item(
        TableName=SENDERS_TABLE,
        Item={
            'from': {'S': number},
            'firstName': {'S': first_name},
            'lastName': {'S': last_name},
            'email': {'S': email},
            'height': {'N': height} if len(height) > 0 else {'NULL': True},
            'birthDate': {'S': birth_date},
            'gender': {'S': gender},
            'notes': {'S': notes},
        },
        ExpressionAttributeNames={
            '#F': 'from',
        },
        ConditionExpression='attribute_not_exists(#F)',
    )

def query_senders(fields=None, exclusive_start_key=None):
    dynamodb = boto3.client('dynamodb')
    kwargs = {'TableName': SENDERS_TABLE}

    if exclusive_start_key is not None:
        kwargs['ExclusiveStartKey'] = exclusive_start_key

    if fields is not None:
        # Include primary key by default
        fields |= {'from'}
        kwargs['ExpressionAttributeNames'] = {f"#F{i}": f for i, f in enumerate(fields)}
        kwargs['ProjectionExpression'] = ", ".join(kwargs['ExpressionAttributeNames'].keys())

    return dynamodb.scan(**kwargs)