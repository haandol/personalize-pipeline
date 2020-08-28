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

export class UserPersonalizationLambdaStack extends cdk.Stack {
  public readonly datasetGroupFunction: lambda.IFunction;
  public readonly datasetFunction: lambda.IFunction;
  public readonly itemDatasetFunction: lambda.IFunction;
  public readonly userDatasetFunction: lambda.IFunction;
  public readonly solutionFunction: lambda.IFunction;
  public readonly campaignFunction: lambda.IFunction;
  public readonly checkReadyFunction: lambda.IFunction;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    const personalizeRole = new iam.Role(this, 'UserPersonalizationPersonalizeRole', {
      assumedBy: new iam.ServicePrincipal('personalize.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess' }
      ],
    });

    this.datasetGroupFunction = new lambda.Function(this, 'DatasetGroupFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'user-personalization')),
      handler: 'create_dataset_group.handler',
      role: props.lambdaExecutionRole,
    });

    this.datasetFunction = new lambda.Function(this, 'DatasetFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'user-personalization')),
      handler: 'create_dataset.handler',
      role: props.lambdaExecutionRole,
      environment: {
        ROLE_ARN: personalizeRole.roleArn,
      },
    });

    this.itemDatasetFunction = new lambda.Function(this, 'ItemDatasetFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'user-personalization')),
      handler: 'create_item_dataset.handler',
      role: props.lambdaExecutionRole,
      environment: {
        ROLE_ARN: personalizeRole.roleArn,
      },
    });

    this.userDatasetFunction = new lambda.Function(this, 'UserDatasetFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'user-personalization')),
      handler: 'create_user_dataset.handler',
      role: props.lambdaExecutionRole,
      environment: {
        ROLE_ARN: personalizeRole.roleArn,
      },
    });

    this.solutionFunction = new lambda.Function(this, 'SolutionFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'user-personalization')),
      handler: 'create_solution.handler',
      role: props.lambdaExecutionRole,
    });

    this.campaignFunction = new lambda.Function(this, 'CampaignFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'common')),
      handler: 'create_campaign.handler',
      role: props.lambdaExecutionRole,
    });

    this.checkReadyFunction = new lambda.Function(this, 'CheckReadyFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'common')),
      handler: 'check_ready.handler',
      role: props.lambdaExecutionRole,
    });
  }

}
