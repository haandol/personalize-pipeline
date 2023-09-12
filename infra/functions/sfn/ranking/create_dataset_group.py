import json
import boto3
import logging

logger = logging.getLogger('dataset-group')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    domain = event['domain']
    schema_arn = event['schema_arn']
    bucket = event['bucket']
    if not bucket.startswith('s3://') and not bucket.endswith('.csv'):
        raise Exception(f'Invalid bucket format, s3://BUCKET_NAME/XYZ.csv but {bucket}')

    create_dataset_group_response = personalize.create_dataset_group(
        name=name,
        domain=domain,
    )
    logger.info(json.dumps(create_dataset_group_response, indent=2))
    dataset_group_arn = create_dataset_group_response['datasetGroupArn']

    event.update({
        'stage': 'DATASET_GROUP',
        'status': 'Invalid',
        'dataset_group_arn': dataset_group_arn,
    })
    return event