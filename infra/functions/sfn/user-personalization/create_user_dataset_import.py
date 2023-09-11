import os
import json
import boto3
import logging

logger = logging.getLogger('user-dataset-import')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')

ROLE_ARN = os.environ['ROLE_ARN']


def handler(event, context):
    logger.info(event)

    name = event['name']
    bucket = event['user_bucket']
    dataset_arn = event['dataset_arn']
    suffix = event['suffix']

    dataset_import_job_arn = ''
    if dataset_arn:
        create_dataset_import_job_response = personalize.create_dataset_import_job(
            jobName=f'{name}-user-{suffix}',
            datasetArn=dataset_arn,
            dataSource={'dataLocation': bucket},
            roleArn=ROLE_ARN,
        )
        dataset_import_job_arn = create_dataset_import_job_response['datasetImportJobArn']
        logger.info(json.dumps(create_dataset_import_job_response, indent=2))

    event.update({
        'stage': 'USER_DATASET_IMPORT',
        'dataset_import_job_arn': dataset_import_job_arn,
    })
    return event