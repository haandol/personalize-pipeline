import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigateway';

export namespace Sfn {
  export interface IntegrationProps {
    resource: apigw.IResource,
    methodOptions: apigw.MethodOptions;
    credentialsRole: iam.IRole,
    stateMachineArn: string;
  }

  export abstract class BaseStack extends cdk.Stack {
    protected readonly methodOptions: apigw.MethodOptions

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props)

      this.methodOptions = {
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
}

export namespace Api {
  export interface IntegrationProps {
    credentialsRole: iam.IRole;
    httpMethod: string;
    function: lambda.IFunction;
    resource: apigw.IResource;
    requestTemplates: {[contentType: string]: string};
    methodOptions: apigw.MethodOptions;
    integrationResponses: apigw.IntegrationResponse[];
  }

  export abstract class BaseStack extends cdk.Stack {
    protected readonly methodOptions: apigw.MethodOptions
    protected readonly integrationResponses: apigw.IntegrationResponse[]

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props)

      this.methodOptions = {
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

      this.integrationResponses = [
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

}