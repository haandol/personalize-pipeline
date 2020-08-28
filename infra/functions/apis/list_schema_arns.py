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

import time
import json
import boto3
import logging

logger = logging.getLogger('list_schemas')
logger.setLevel(logging.INFO)

client = boto3.client('personalize')


def handler(event, context):
    logger.info(event)

    schema_arn = event.get('schema_arn', '')
    if schema_arn:
        schema = client.describe_schema(schemaArn=schema_arn)['schema']
        return {
            'name': schema['name'],
            'schema': schema['schema'],
        }
    else:
        response = client.list_schemas(maxResults=100)
        schema_list = []
        for schema in response['schemas']:
            schema_list.append({
                'name': schema['name'],
                'schema_arn': schema['schemaArn'],
            })
        return schema_list