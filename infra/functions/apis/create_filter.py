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

logger = logging.getLogger('create-filter')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    dataset_group_name = event['dataset_group_name']
    filter_expression = event['filter_expression']

    dataset_group_arn = ''
    dataset_groups_response = personalize.list_dataset_groups(maxResults=100)
    for dataset_group in dataset_groups_response['datasetGroups']:
        if dataset_group['name'] == dataset_group_name:
            dataset_group_arn = dataset_group['datasetGroupArn']
            break
    if not dataset_group_arn:
        raise RuntimeError(f'There is no dataset group for name: {name}')

    create_filter_response = personalize.create_filter(
        name=name,
        datasetGroupArn=dataset_group_arn,
        filterExpression=filter_expression,
    )
    logger.info(json.dumps(create_filter_response, indent=2))
    filter_arn = create_filter_response['filterArn']

    return {
        'name': name,
        'dataset_group_arn': dataset_group_arn,
        'filter_arn': filter_arn,
    }