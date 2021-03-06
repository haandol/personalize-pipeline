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
    dataset_arn = event['dataset_arn']
    suffix = datetime.now().strftime('%Y%m%dT%H%M%S')

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
        datasetGroupArn=dataset_group_arn,
    )
    logger.info(json.dumps(create_event_tracker_response, indent=2))

    event.update({
        'stage': 'DATASET_IMPORT',
        'suffix': suffix,
        'dataset_import_job_arn': dataset_import_job_arn,
    })
    return event