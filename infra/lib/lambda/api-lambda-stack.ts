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
}

export class ApiLambdaStack extends cdk.Stack {
  public readonly lambdaExecutionRole: iam.IRole;
  public readonly getTrackingIdFunction: lambda.IFunction;
  public readonly getMetricsFunction: lambda.IFunction;
  public readonly recommendSimsFunction: lambda.IFunction;
  public readonly recommendHrnnFunction: lambda.IFunction;
  public readonly recommendRankingFunction: lambda.IFunction;
  public readonly listCampaignArnsFunction: lambda.IFunction;
  public readonly createSchemaFunction: lambda.IFunction;
  public readonly listSchemaArnsFunction: lambda.IFunction;

  constructor(scope: cdk.Construct, id: string, props?: Props) {
    super(scope, id, props);

    this.lambdaExecutionRole = new iam.Role(this, 'ApiLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
      ],
    });

    this.getTrackingIdFunction = new lambda.Function(this, 'GetTrackingIdFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../functions/apis')),
      handler: 'get_tracking_id.handler',
      role: this.lambdaExecutionRole,
    });

    this.getMetricsFunction = new lambda.Function(this, 'GetMetricsFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../functions/apis')),
      handler: 'get_metrics.handler',
      role: this.lambdaExecutionRole,
    });

    this.recommendSimsFunction = new lambda.Function(this, 'RecommendSimsFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../functions/apis')),
      handler: 'recommend_sims.handler',
      role: this.lambdaExecutionRole,
      currentVersionOptions: {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    });

    this.recommendHrnnFunction = new lambda.Function(this, 'RecommendHrnnFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../functions/apis')),
      handler: 'recommend_hrnn.handler',
      role: this.lambdaExecutionRole,
      currentVersionOptions: {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    });

    this.recommendRankingFunction = new lambda.Function(this, 'RecommendRankingFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../functions/apis')),
      handler: 'recommend_ranking.handler',
      role: this.lambdaExecutionRole,
      currentVersionOptions: {
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    });

    this.listCampaignArnsFunction = new lambda.Function(this, 'ListCampaignArnsFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../functions/apis')),
      handler: 'list_campaign_arns.handler',
      role: this.lambdaExecutionRole,
    });

    this.createSchemaFunction = new lambda.Function(this, 'CreateSchemaFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../functions/apis')),
      handler: 'create_schema.handler',
      role: this.lambdaExecutionRole,
    });

    this.listSchemaArnsFunction = new lambda.Function(this, 'ListSchemaArnsFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../../functions/apis')),
      handler: 'list_schema_arns.handler',
      role: this.lambdaExecutionRole,
    });
  }

}
