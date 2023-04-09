def access_control(methods):
    methods.add('OPTIONS')

    def add_cors_headers(f):
        def new_f(event, context):
            if event['httpMethod'] == 'OPTIONS':
                return {
                    'statusCode': 200,
                    'body': 'Ok',
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': ','.join(methods),
                        'Access-Control-Allow-Headers': 'Content-Type',
                    },
                }

            response = f(event, context)
            headers = response.get('headers', {})
            headers['Access-Control-Allow-Origin'] = '*'
            headers['Access-Control-Allow-Methods'] = ','.join(methods)
            headers['Access-Control-Allow-Headers'] = 'Content-Type',
            response['headers'] = headers
            return response
        return new_f
    return add_cors_headers