###############################################################################
# Copyright 2019 Amazon.com, Inc. and its affiliates. All Rights Reserved.    #
#                                                                             #
# Licensed under the Amazon Software License (the "License").                 #
#  You may not use this file except in compliance with the License.           #
# A copy of the License is located at                                         #
#                                                                             #
#  http://aws.amazon.com/asl/                                                 #
#                                                                             #
#  or in the "license" file accompanying this file. This file is distributed  #
#  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either  #
#  express or implied. See the License for the specific language governing    #
#  permissions and limitations under the License.                             #
###############################################################################

import os
import json
import boto3
import logging
from time import sleep
from datetime import datetime

logger = logging.getLogger('dataset')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')

ROLE_ARN = os.environ['ROLE_ARN']


def handler(event, context):
    logger.info(event)

    name = event['name']
    bucket = event['bucket']
    schema_arn = event['schema_arn']
    dataset_group_arn = event['dataset_group_arn']
    suffix = datetime.now().strftime('%Y%m%dT%H%M%S')

    dataset_type = 'INTERACTIONS'
    create_dataset_response = personalize.create_dataset(
        datasetType=dataset_type,
        datasetGroupArn=dataset_group_arn,
        schemaArn=schema_arn,
        name=name,
    )
    dataset_arn = create_dataset_response['datasetArn']
    logger.info(json.dumps(create_dataset_response, indent=2))

    attach_policy(bucket)

    # wait for dataset is ready
    sleep(20)

    create_dataset_import_job_response = personalize.create_dataset_import_job(
        jobName=f'{name}-{suffix}',
        datasetArn=dataset_arn,
        dataSource={'dataLocation': bucket},
        roleArn=ROLE_ARN,
    )
    dataset_import_job_arn = create_dataset_import_job_response['datasetImportJobArn']
    logger.info(json.dumps(create_dataset_import_job_response, indent=2))

    create_event_tracker_response = personalize.create_event_tracker(
        name=name,
        datasetGroupArn=dataset_group_arn
    )
    logger.info(json.dumps(create_event_tracker_response, indent=2))

    event.update({
        'stage': 'DATASET_IMPORT',
        'suffix': suffix,
        'dataset_arn': dataset_arn,
        'dataset_import_job_arn': dataset_import_job_arn,
    })
    return event


def attach_policy(bucket):
    bucket_name = bucket.replace('s3://', '').split('/', 1)[0]
    s3 = boto3.client('s3')
    policy = {
        'Version': '2012-10-17',
        'Id': 'PersonalizeS3BucketAccessPolicy',
        'Statement': [
            {
                'Sid': 'PersonalizeS3BucketAccessPolicy',
                'Effect': 'Allow',
                'Principal': {
                    'Service': 'personalize.amazonaws.com'
                },
                'Action': [
                    's3:GetObject',
                    's3:ListBucket'
                ],
                'Resource': [
                    'arn:aws:s3:::{}'.format(bucket_name),
                    'arn:aws:s3:::{}/*'.format(bucket_name)
                ]
            }
        ]
    }
    s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))