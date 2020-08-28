/* *****************************************************************************
 * * Copyright 2019 Amazon.com, Inc. and its affiliates. All Rights Reserved.  *
 *                                                                             *
 * Licensed under the Amazon Software License (the "License").                 *
 *  You may not use this file except in compliance with the License.           *
 * A copy of the License is located at                                         *
 *                                                                             *
 *  http://aws.amazon.com/asl/                                                 *
 *                                                                             *
 *  or in the "license" file accompanying this file. This file is distributed  *
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either  *
 *  express or implied. See the License for the specific language governing    *
 *  permissions and limitations under the License.                             *
 * *************************************************************************** *
*/

import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as apigw from '@aws-cdk/aws-apigateway';
import { EventRequestModels, RequestValidators } from '../interfaces/interface';

interface Props extends cdk.StackProps {
  api: apigw.IRestApi;
  requestModels: EventRequestModels;
  requestValidators: RequestValidators;
  credentialsRole: iam.IRole;
  eventStream: kinesis.IStream;
}

interface IntegrationProps {
  stream: kinesis.IStream;
  requestTemplates: {[contentType: string]: string};
  resource: apigw.IResource,
  resourceOptions: apigw.MethodOptions;
  credentialsRole: iam.IRole,
}

export class KinesisIntegrationStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    // Add common resource
    const resource = props.api.root.resourceForPath('personalize');
    const resourceOptions: apigw.MethodOptions = {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigw.Model.EMPTY_MODEL,
          },
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Credentials': true,
          },
        }
      ],
    };

    // Create Kinesis integrations
    this.registerKinesisIntegration({
      stream: props.eventStream,
      requestTemplates: {
        'application/json': JSON.stringify({
          "StreamName": props.eventStream.streamName,
          "PartitionKey": apigw.AccessLogField.contextRequestId(),
          "Data": "$util.base64Encode($input.json('$'))",
        }),
      },
      resource: resource.addResource('events'),
      resourceOptions: {
        ...resourceOptions,
        requestModels: {
          'application/json': props.requestModels.PutEventsModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
    });
  }

  registerKinesisIntegration(props: IntegrationProps) {
    const kinesisIntegration = new apigw.AwsIntegration({
      service: 'kinesis',
      action: 'PutRecord',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: props.credentialsRole,
        passthroughBehavior: apigw.PassthroughBehavior.NEVER,
        requestTemplates: props.requestTemplates,
        integrationResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,POST,GET'",
            'method.response.header.Access-Control-Allow-Credentials': "'false'",
          },
        }],
      },
    });
    props.resource.addMethod('POST', kinesisIntegration, props.resourceOptions);
  }

}