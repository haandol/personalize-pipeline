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
import * as sns from '@aws-cdk/aws-sns';
import * as lambda from '@aws-cdk/aws-lambda';
import { SnsEventSource } from '@aws-cdk/aws-lambda-event-sources'

export class CommonStack extends cdk.Stack {
  public readonly doneTopic: sns.ITopic;
  public readonly failTopic: sns.ITopic;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, 'NotifyLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
      ],
    });
    role.addToPolicy(new iam.PolicyStatement({
      actions: [
        'SES:SendEmail',
        'SES:SendRawEmail'
      ],
      resources: ['*'],
    }));

    // Common Topics
    this.doneTopic = new sns.Topic(this, 'DoneTopic');
    this.failTopic = new sns.Topic(this, 'FailTopic');

    // Notification
    const notifySender = scope.node.tryGetContext('notifySender') || '';
    const notifyEmail = scope.node.tryGetContext('notifyEmail') || '';
    const notifySlack = scope.node.tryGetContext('notifySlack') || '';

    const notifyDoneFunction = new lambda.Function(this, 'NotifyDoneFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'common')),
      handler: 'notify.handler',
      role,
      timeout: cdk.Duration.seconds(5),
      environment: {
        'STATUS': 'DONE',
        'SENDER': notifySender,
        'TO_ADDR': notifyEmail,
        'SLACK_WEBHOOK_URL': notifySlack,
      },
    });
    notifyDoneFunction.addEventSource(new SnsEventSource(this.doneTopic));

    const notifyFailFunction = new lambda.Function(this, 'NotifyFailFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'common')),
      handler: 'notify.handler',
      role,
      timeout: cdk.Duration.seconds(5),
      environment: {
        'STATUS': 'FAILED',
        'SENDER': notifySender,
        'TO_ADDR': notifyEmail,
        'SLACK_WEBHOOK_URL': notifySlack,
      },
    });
    notifyFailFunction.addEventSource(new SnsEventSource(this.failTopic));
  }

}