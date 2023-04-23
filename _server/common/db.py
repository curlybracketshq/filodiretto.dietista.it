import boto3

MESSAGES_TABLE = "filoDirettoMessages"


def query_last_message_from(number):
    dynamodb = boto3.client('dynamodb')
    return dynamodb.query(
        TableName=MESSAGES_TABLE,
        ExpressionAttributeValues={':f': {'S': number}},
        ExpressionAttributeNames={'#F': 'from'},
        KeyConditionExpression='#F = :f',
        ScanIndexForward=False,
        Limit=1,
    )