import boto3

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