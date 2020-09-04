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

import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as lambda from '@aws-cdk/aws-lambda';
import { KinesisEventSource } from '@aws-cdk/aws-lambda-event-sources';

export class EventKinesisStack extends cdk.Stack {
  public readonly stream: kinesis.IStream;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.stream = new kinesis.Stream(this, `EventStream`);

    const role = new iam.Role(this, `KinesisFunctionExecutionRole`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonKinesisFullAccess' },
      ],
    });
    const putEventsFunction = new lambda.Function(this, `PutEventsFunction`, {
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'kinesis')),
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: 'put_events.handler',
      memorySize: 256,
      role,
      currentVersionOptions: {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    });

    putEventsFunction.addEventSource(new KinesisEventSource(this.stream, {
      startingPosition: lambda.StartingPosition.LATEST,
      maxBatchingWindow: cdk.Duration.seconds(15),
      batchSize: 400,
      retryAttempts: 10000,
    }));
  }

}