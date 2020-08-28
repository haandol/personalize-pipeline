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
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as apigw from '@aws-cdk/aws-apigateway';
import { StatesRequestModels, RequestValidators } from '../interfaces/interface';

interface Props extends cdk.StackProps {
  api: apigw.IRestApi;
  requestModels: StatesRequestModels;
  requestValidators: RequestValidators;
  credentialsRole: iam.IRole;
  simsStateMachine: sfn.IStateMachine;
  userPersonalizationStateMachine: sfn.IStateMachine;
  metadataDatasetStateMachine: sfn.IStateMachine;
  interactionsDatasetStateMachine: sfn.IStateMachine;
  rankingStateMachine: sfn.IStateMachine;
  batchInferenceStateMachine: sfn.IStateMachine;
  trainRecipeStateMachine: sfn.IStateMachine;
  cleanupStateMachine: sfn.IStateMachine;
}

interface IntegrationProps {
  resource: apigw.IResource,
  methodOptions: apigw.MethodOptions;
  credentialsRole: iam.IRole,
  stateMachineArn: string;
}

export class SfnIntegrationStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    // Add common resource
    const resource = props.api.root.resourceForPath('personalize');
    const methodOptions: apigw.MethodOptions = {
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

    // Create sfn integrations
    this.registerSfnIntegration({
      resource: resource.addResource('sims'),
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.SimsModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: props.simsStateMachine.stateMachineArn,
    });

    this.registerSfnIntegration({
      resource: resource.addResource('user-personalization'),
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.UserPersonalizationModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: props.userPersonalizationStateMachine.stateMachineArn,
    });
 
    this.registerSfnIntegration({
      resource: resource.addResource('metadata-dataset'),
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.MetadataDatasetModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: props.metadataDatasetStateMachine.stateMachineArn,
    });

    this.registerSfnIntegration({
      resource: resource.addResource('interactions-dataset'),
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.InteractionsDatasetModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: props.interactionsDatasetStateMachine.stateMachineArn,
    });

    this.registerSfnIntegration({
      resource: resource.addResource('ranking'),
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.RankingModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: props.rankingStateMachine.stateMachineArn,
    });

    this.registerSfnIntegration({
      resource: resource.addResource('batch-inference'),
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.BatchInferenceModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: props.batchInferenceStateMachine.stateMachineArn,
    });

    this.registerSfnIntegration({
      resource: resource.addResource('train-recipe'),
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.TrainRecipeModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: props.trainRecipeStateMachine.stateMachineArn,
    });

    this.registerSfnIntegration({
      resource: resource.addResource('cleanup'),
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.CleanupModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: props.cleanupStateMachine.stateMachineArn,
    });
  }

  registerSfnIntegration(props: IntegrationProps) {
    const sfnIntegration = new apigw.AwsIntegration({
      service: 'states',
      action: 'StartExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: props.credentialsRole,
        requestTemplates: {
          'application/json': `
            {
              "input": "$util.escapeJavaScript($input.json('$'))",
              "stateMachineArn": "${props.stateMachineArn}"
            }
          `,
        },
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
    props.resource.addMethod('POST', sfnIntegration, props.methodOptions);
  }

}