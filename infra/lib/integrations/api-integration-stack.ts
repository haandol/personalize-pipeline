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
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigateway';
import { ApiRequestModels, RequestValidators } from '../interfaces/interface';

interface Props extends cdk.StackProps {
  api: apigw.IRestApi;
  requestModels: ApiRequestModels;
  requestValidators: RequestValidators;
  credentialsRole: iam.IRole;
  getTrackingIdFunction: lambda.IFunction;
  getMetricsFunction: lambda.IFunction;
  recommendSimsFunction: lambda.IFunction;
  recommendHrnnFunction: lambda.IFunction;
  recommendRankingFunction: lambda.IFunction;
  listCampaignArnsFunction: lambda.IFunction;
  createSchemaFunction: lambda.IFunction;
  listSchemaArnsFunction: lambda.IFunction;
  listSolutionVersionArnsFunction: lambda.IFunction;
  putEventsFunction: lambda.IFunction;
}

interface IntegrationProps {
  credentialsRole: iam.IRole;
  httpMethod: string;
  function: lambda.IFunction;
  resource: apigw.IResource;
  requestTemplates: {[contentType: string]: string};
  methodOptions: apigw.MethodOptions;
  integrationResponses: apigw.IntegrationResponse[];
}

export class ApiIntegrationStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    // Get common resource
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
    const integrationResponses: apigw.IntegrationResponse[] = [
      {
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,POST,GET'",
          'method.response.header.Access-Control-Allow-Credentials': "'false'",
        },
      }
    ];

    // Create lambda integrations (Apis)
    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: props.listCampaignArnsFunction,
      resource: resource.addResource('campaigns'),
      requestTemplates: {
        'application/json': JSON.stringify({}),
      },
      methodOptions,
      integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: props.getTrackingIdFunction,
      resource: resource.addResource('tracking'),
      requestTemplates: {
        'application/json': JSON.stringify({
          "name": "$input.params('name')",
        }),
      },
      methodOptions: {
        ...methodOptions,
        requestParameters: {
          'method.request.querystring.name': true,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: props.getMetricsFunction,
      resource: resource.addResource('metrics'),
      requestTemplates: {
        'application/json': JSON.stringify({
          "name": "$input.params('name')",
        }),
      },
      methodOptions: {
        ...methodOptions,
        requestParameters: {
          'method.request.querystring.name': true,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses,
    });

    const recommendResource = resource.addResource('recommend');
    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: props.recommendSimsFunction,
      resource: recommendResource.addResource('sims'),
      requestTemplates: {
        'application/json': JSON.stringify({
          "campaign_arn": "$input.params('campaign_arn')",
          "item_id": "$input.params('item_id')",
          "num_results": "$input.params('num_results')"
        }),
      },
      methodOptions: {
        ...methodOptions,
        requestParameters: {
          'method.request.querystring.campaign_arn': false,
          'method.request.querystring.item_id': true,
          'method.request.querystring.num_results': false,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: props.recommendHrnnFunction,
      resource: recommendResource.addResource('hrnn'),
      requestTemplates: {
        'application/json': JSON.stringify({
          "campaign_arn": "$input.params('campaign_arn')",
          "user_id": "$input.params('user_id')",
          "num_results": "$input.params('num_results')"
        }),
      },
      methodOptions: {
        ...methodOptions,
        requestParameters: {
          'method.request.querystring.campaign_arn': false,
          'method.request.querystring.user_id': true,
          'method.request.querystring.num_results': false,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: props.recommendRankingFunction,
      resource: recommendResource.addResource('ranking'),
      requestTemplates: {
        'application/json': JSON.stringify({
          "campaign_arn": "$input.params('campaign_arn')",
          "user_id": "$input.params('user_id')",
          "item_list": "$input.params('item_list')"
        }),
      },
      methodOptions: {
        ...methodOptions,
        requestParameters: {
          'method.request.querystring.campaign_arn': false,
          'method.request.querystring.user_id': true,
          'method.request.querystring.item_list': true,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses,
    });

    const schemaResource = resource.addResource('schema');
    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'POST',
      function: props.createSchemaFunction,
      resource: schemaResource,
      requestTemplates: {
        'application/json': `$input.json('$')`,
      },
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.CreateSchemaModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: props.listSchemaArnsFunction,
      resource: schemaResource,
      requestTemplates: {
        'application/json': JSON.stringify({
          "schema_arn": "$input.params('schema_arn')",
        }),
      },
      methodOptions: {
        ...methodOptions,
        requestParameters: {
          'method.request.querystring.schema_arn': false,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: props.listSolutionVersionArnsFunction,
      resource: resource.addResource('solution-versions'),
      requestTemplates: {
        'application/json': JSON.stringify({}),
      },
      methodOptions,
      integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'POST',
      function: props.putEventsFunction,
      resource: resource.addResource('put-events'),
      requestTemplates: {
        'application/json': `$input.json('$')`,
      },
      methodOptions: {
        ...methodOptions,
        requestModels: {
          'application/json': props.requestModels.PutEventsModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      integrationResponses,
    });
  }

  registerLambdaIntegration(props: IntegrationProps): void {
    const lambdaIntegration = new apigw.LambdaIntegration(props.function, {
      proxy: false,
      credentialsRole: props.credentialsRole,
      passthroughBehavior: apigw.PassthroughBehavior.NEVER,
      requestTemplates: props.requestTemplates,
      integrationResponses: props.integrationResponses,
    });
    props.resource.addMethod(props.httpMethod, lambdaIntegration, props.methodOptions);
  }

}