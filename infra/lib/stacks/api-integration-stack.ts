import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { ApiRequestModels, RequestValidators } from '../interfaces/interface';
import { Api } from '../interfaces/base-stack';
import { ApiLambdas } from '../constructs/api-lambdas';

interface Props extends cdk.StackProps {
  api: apigw.IRestApi;
  requestModels: ApiRequestModels;
  requestValidators: RequestValidators;
  credentialsRole: iam.IRole;
}

interface IntegrationProps {
  credentialsRole: iam.IRole;
  httpMethod: string;
  function: lambda.IFunction;
  resource: apigw.IResource;
  requestTemplates: { [contentType: string]: string };
  methodOptions: apigw.MethodOptions;
  integrationResponses: apigw.IntegrationResponse[];
}

export class ApiIntegrationStack extends Api.BaseStack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const lambdaFunctions = new ApiLambdas(this, `ApiLambdas`);

    // Get common resource
    const resource = props.api.root.resourceForPath('personalize');

    // Create lambda integrations (Apis)
    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: lambdaFunctions.listCampaignArnsFunction,
      resource: resource.addResource('campaigns'),
      requestTemplates: {
        'application/json': JSON.stringify({}),
      },
      methodOptions: this.methodOptions,
      integrationResponses: this.integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: lambdaFunctions.getTrackingIdFunction,
      resource: resource.addResource('tracking'),
      requestTemplates: {
        'application/json': JSON.stringify({
          name: "$input.params('name')",
        }),
      },
      methodOptions: {
        ...this.methodOptions,
        requestParameters: {
          'method.request.querystring.name': true,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: lambdaFunctions.getMetricsFunction,
      resource: resource.addResource('metrics'),
      requestTemplates: {
        'application/json': JSON.stringify({
          name: "$input.params('name')",
        }),
      },
      methodOptions: {
        ...this.methodOptions,
        requestParameters: {
          'method.request.querystring.name': true,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    // Recommend
    const recommendResource = resource.addResource('recommend');
    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: lambdaFunctions.recommendSimilarItemsFunction,
      resource: recommendResource.addResource('similar-items'),
      requestTemplates: {
        'application/json': JSON.stringify({
          campaign_arn: "$input.params('campaign_arn')",
          item_id: "$input.params('item_id')",
          num_results: "$input.params('num_results')",
        }),
      },
      methodOptions: {
        ...this.methodOptions,
        requestParameters: {
          'method.request.querystring.campaign_arn': false,
          'method.request.querystring.item_id': true,
          'method.request.querystring.num_results': false,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: lambdaFunctions.recommendUserPersonalizationFunction,
      resource: recommendResource.addResource('user-personalization'),
      requestTemplates: {
        'application/json': JSON.stringify({
          campaign_arn: "$input.params('campaign_arn')",
          user_id: "$input.params('user_id')",
          num_results: "$input.params('num_results')",
        }),
      },
      methodOptions: {
        ...this.methodOptions,
        requestParameters: {
          'method.request.querystring.campaign_arn': false,
          'method.request.querystring.user_id': true,
          'method.request.querystring.num_results': false,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: lambdaFunctions.recommendRankingFunction,
      resource: recommendResource.addResource('ranking'),
      requestTemplates: {
        'application/json': JSON.stringify({
          campaign_arn: "$input.params('campaign_arn')",
          user_id: "$input.params('user_id')",
          item_list: "$input.params('item_list')",
        }),
      },
      methodOptions: {
        ...this.methodOptions,
        requestParameters: {
          'method.request.querystring.campaign_arn': false,
          'method.request.querystring.user_id': true,
          'method.request.querystring.item_list': true,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    // Schema
    const schemaResource = resource.addResource('schema');
    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'POST',
      function: lambdaFunctions.createSchemaFunction,
      resource: schemaResource,
      requestTemplates: {
        'application/json': `$input.json('$')`,
      },
      methodOptions: {
        ...this.methodOptions,
        requestModels: {
          'application/json': props.requestModels.CreateSchemaModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'DELETE',
      function: lambdaFunctions.deleteSchemaFunction,
      resource: schemaResource,
      requestTemplates: {
        'application/json': JSON.stringify({
          schema_arn: "$input.params('schema_arn')",
        }),
      },
      methodOptions: {
        ...this.methodOptions,
        requestParameters: {
          'method.request.querystring.schema_arn': true,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: lambdaFunctions.listSchemaArnsFunction,
      resource: schemaResource,
      requestTemplates: {
        'application/json': JSON.stringify({
          schema_arn: "$input.params('schema_arn')",
        }),
      },
      methodOptions: {
        ...this.methodOptions,
        requestParameters: {
          'method.request.querystring.schema_arn': false,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    // Solutions
    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: lambdaFunctions.listSolutionVersionArnsFunction,
      resource: resource.addResource('solution-versions'),
      requestTemplates: {
        'application/json': JSON.stringify({}),
      },
      methodOptions: this.methodOptions,
      integrationResponses: this.integrationResponses,
    });

    // Events
    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'POST',
      function: lambdaFunctions.putEventsFunction,
      resource: resource.addResource('put-events'),
      requestTemplates: {
        'application/json': `$input.json('$')`,
      },
      methodOptions: {
        ...this.methodOptions,
        requestModels: {
          'application/json': props.requestModels.PutEventsModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    // Filter
    const filterResource = resource.addResource('filter');
    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'POST',
      function: lambdaFunctions.createFilterFunction,
      resource: filterResource,
      requestTemplates: {
        'application/json': `$input.json('$')`,
      },
      methodOptions: {
        ...this.methodOptions,
        requestModels: {
          'application/json': props.requestModels.CreateFilterModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'DELETE',
      function: lambdaFunctions.deleteFilterFunction,
      resource: filterResource,
      requestTemplates: {
        'application/json': JSON.stringify({
          filter_arn: "$input.params('filter_arn')",
        }),
      },
      methodOptions: {
        ...this.methodOptions,
        requestParameters: {
          'method.request.querystring.filter_arn': true,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses: this.integrationResponses,
    });

    this.registerLambdaIntegration({
      credentialsRole: props.credentialsRole,
      httpMethod: 'GET',
      function: lambdaFunctions.listFilterArnsFunction,
      resource: filterResource,
      requestTemplates: {
        'application/json': JSON.stringify({
          name: "$input.params('name')",
        }),
      },
      methodOptions: {
        ...this.methodOptions,
        requestParameters: {
          'method.request.querystring.name': true,
        },
        requestValidator: props.requestValidators.parameterValidator,
      },
      integrationResponses: this.integrationResponses,
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
    props.resource.addMethod(
      props.httpMethod,
      lambdaIntegration,
      props.methodOptions
    );
  }
}
