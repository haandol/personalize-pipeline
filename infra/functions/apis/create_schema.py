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

logger = logging.getLogger('create-schema')
logger.setLevel(logging.INFO)

personalize = boto3.client(service_name='personalize')


def handler(event, context):
    logger.info(event)

    name = event['name']
    schema = json.dumps(json.loads(event['schema']))

    create_schema_response = personalize.create_schema(
        name=name,
        schema=schema
    )
    logger.info(json.dumps(create_schema_response, indent=2))
    schema_arn = create_schema_response['schemaArn']

    return { 'schema_arn': schema_arn }