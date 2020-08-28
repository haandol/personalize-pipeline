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
from datetime import datetime

logger = logging.getLogger('recommend-batch')
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
client = boto3.client('personalize')

ROLE_ARN = os.environ['ROLE_ARN']


def handler(event, context):
    logger.debug(event)

    suffix = datetime.now().strftime('%Y%m%dT%H%M%S')
    name = event['name']
    solution_version_arn = event['solution_version_arn']
    num_results = int(event.get('num_results', '') or 25)
    input_path = event['input_path']
    if not input_path.startswith('s3://') and not input_path.endswith('.json'):
        raise Exception(f'Invalid bucket format, s3://BUCKET_NAME/XYZ.json but {input_path}')

    output_path = event['output_path']
    if not output_path.startswith('s3://') and not output_path.endswith('/'):
        raise Exception(f'Invalid bucket format, s3://BUCKET_NAME/ but {output_path}')

    attach_policy(input_path)
    attach_policy(output_path)

    params = dict(
        jobName=f'{name}-{suffix}',
        solutionVersionArn=solution_version_arn,
        numResults=num_results,
        jobInput={
            's3DataSource': {
                'path': input_path,
            }
        },
        jobOutput={
            's3DataDestination': {
                'path': output_path,
            }
        },
        roleArn=ROLE_ARN
    )
    batch_inference_job_config = event.get('batch_inference_job_config', {})
    if batch_inference_job_config:
        params['batchInferenceJobConfig'] = batch_inference_job_config
 
    batch_inference_job_resp = client.create_batch_inference_job(**params)
    return {
        'batch_inference_job_arn': batch_inference_job_resp['batchInferenceJobArn'],
    }


def attach_policy(bucket):
    bucket_name = bucket.replace('s3://', '').split('/', 1)[0]
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
                    's3:*Object',
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