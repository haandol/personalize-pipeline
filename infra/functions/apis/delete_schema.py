import json
import boto3
import logging

logger = logging.getLogger('delete-schema')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    schema_arn = event['schema_arn']

    personalize.delete_schema(schemaArn=schema_arn)
 
    return { 'schema_arn': schema_arn }