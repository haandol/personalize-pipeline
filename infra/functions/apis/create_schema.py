import json
import boto3
import logging

logger = logging.getLogger('create-schema')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    schema = json.dumps(event['schema'])

    create_schema_response = personalize.create_schema(
        name=name,
        schema=schema
    )
    logger.info(json.dumps(create_schema_response, indent=2))
    schema_arn = create_schema_response['schemaArn']

    return { 'schema_arn': schema_arn }