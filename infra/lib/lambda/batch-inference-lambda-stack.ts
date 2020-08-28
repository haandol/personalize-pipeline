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
import * as lambda from '@aws-cdk/aws-lambda';

interface Props extends cdk.StackProps {
  lambdaExecutionRole: iam.IRole;
}

export class BatchInferenceLambdaStack extends cdk.Stack {
  public readonly batchInferenceFunction: lambda.IFunction;
  public readonly checkBatchReadyFunction: lambda.IFunction;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    const role = new iam.Role(this, 'BatchInferenceRole', {
      assumedBy: new iam.ServicePrincipal('personalize.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
      ],
    });
    this.batchInferenceFunction = new lambda.Function(this, 'BatchInferenceFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'batch-inference')),
      handler: 'create_batch_inference.handler',
      role: props.lambdaExecutionRole,
      environment: {
        ROLE_ARN: role.roleArn,
      }
    });

    this.checkBatchReadyFunction = new lambda.Function(this, 'CheckReadyFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'common')),
      handler: 'check_batch_ready.handler',
      role: props.lambdaExecutionRole,
    });
  }

}
