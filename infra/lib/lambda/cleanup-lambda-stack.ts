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

export class CleanupLambdaStack extends cdk.Stack {
  public readonly fetchArnFunction: lambda.IFunction;
  public readonly deleteResourceFunction: lambda.IFunction;
  public readonly checkDeleteFunction: lambda.IFunction;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    this.fetchArnFunction = new lambda.Function(this, 'FetchArnFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'cleanup')),
      handler: 'fetch_arn.handler',
      role: props.lambdaExecutionRole,
    });

    this.deleteResourceFunction = new lambda.Function(this, 'DeleteResourceFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'cleanup')),
      handler: 'delete_resource.handler',
      role: props.lambdaExecutionRole,
    });

    this.checkDeleteFunction = new lambda.Function(this, 'CheckDeleteFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'cleanup')),
      handler: 'check_delete.handler',
      role: props.lambdaExecutionRole,
    });
  }

}
