import boto3
import logging

logger = logging.getLogger('list_schemas')
logger.setLevel(logging.INFO)

client = boto3.client('personalize')


def handler(event, context):
    logger.info(event)

    schema_arn = event.get('schema_arn', '')
    if schema_arn:
        schema = client.describe_schema(schemaArn=schema_arn)['schema']
        return {
            'name': schema['name'],
            'schema': schema['schema'],
        }
    else:
        response = client.list_schemas(maxResults=100)
        schema_list = []
        for schema in response['schemas']:
            schema_list.append({
                'name': schema['name'],
                'schema_arn': schema['schemaArn'],
            })
        return schema_list