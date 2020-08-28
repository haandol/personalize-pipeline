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

import json
import boto3
import logging

logger = logging.getLogger('dataset-group')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    schema_arn = event['schema_arn']
    bucket = event['bucket']
    if not bucket.startswith('s3://') and not bucket.endswith('.csv'):
        raise Exception(f'Invalid bucket format, s3://BUCKET_NAME/XYZ.csv but {bucket}')

    create_dataset_group_response = personalize.create_dataset_group(name=name)
    logger.info(json.dumps(create_dataset_group_response, indent=2))
    dataset_group_arn = create_dataset_group_response['datasetGroupArn']

    event.update({
        'stage': 'DATASET_GROUP',
        'status': 'Invalid',
        'dataset_group_arn': dataset_group_arn,
    })
    return event