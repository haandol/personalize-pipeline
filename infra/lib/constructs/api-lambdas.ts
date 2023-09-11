import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class ApiLambdas extends Construct {
  public readonly lambdaExecutionRole: iam.IRole;
  public readonly getTrackingIdFunction: lambda.IFunction;
  public readonly getMetricsFunction: lambda.IFunction;
  public readonly recommendSimilarItemsFunction: lambda.IFunction;
  public readonly recommendUserPersonalizationFunction: lambda.IFunction;
  public readonly recommendRankingFunction: lambda.IFunction;
  public readonly listCampaignArnsFunction: lambda.IFunction;
  public readonly createSchemaFunction: lambda.IFunction;
  public readonly deleteSchemaFunction: lambda.IFunction;
  public readonly listSchemaArnsFunction: lambda.IFunction;
  public readonly listSolutionVersionArnsFunction: lambda.IFunction;
  public readonly putEventsFunction: lambda.IFunction;
  public readonly createFilterFunction: lambda.IFunction;
  public readonly deleteFilterFunction: lambda.IFunction;
  public readonly listFilterArnsFunction: lambda.IFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.lambdaExecutionRole = new iam.Role(this, 'ApiLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        },
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess',
        },
      ],
    });

    const runtime = lambda.Runtime.PYTHON_3_7;
    const code = lambda.Code.fromAsset(
      path.resolve(__dirname, '..', '..', 'functions', 'apis')
    );
    const role = this.lambdaExecutionRole;

    this.getTrackingIdFunction = new lambda.Function(
      this,
      'GetTrackingIdFunction',
      {
        code,
        runtime,
        role,
        handler: 'get_tracking_id.handler',
      }
    );

    this.getMetricsFunction = new lambda.Function(this, 'GetMetricsFunction', {
      code,
      runtime,
      role,
      handler: 'get_metrics.handler',
      timeout: cdk.Duration.seconds(15),
    });

    this.recommendSimilarItemsFunction = new lambda.Function(
      this,
      'RecommendSimilarItemsFunction',
      {
        code,
        runtime,
        role,
        handler: 'recommend_similar_items.handler',
        currentVersionOptions: {
          removalPolicy: cdk.RemovalPolicy.RETAIN,
        },
      }
    );

    this.recommendUserPersonalizationFunction = new lambda.Function(
      this,
      'RecommendUserPersonalizationFunction',
      {
        code,
        runtime,
        role,
        handler: 'recommend_user_personalization.handler',
        currentVersionOptions: {
          removalPolicy: cdk.RemovalPolicy.RETAIN,
        },
      }
    );

    this.recommendRankingFunction = new lambda.Function(
      this,
      'RecommendRankingFunction',
      {
        code,
        runtime,
        role,
        handler: 'recommend_ranking.handler',
      }
    );

    this.listCampaignArnsFunction = new lambda.Function(
      this,
      'ListCampaignArnsFunction',
      {
        code,
        runtime,
        role,
        handler: 'list_campaign_arns.handler',
        timeout: cdk.Duration.seconds(15),
      }
    );

    this.createSchemaFunction = new lambda.Function(
      this,
      'CreateSchemaFunction',
      {
        code,
        runtime,
        role,
        handler: 'create_schema.handler',
      }
    );

    this.deleteSchemaFunction = new lambda.Function(
      this,
      'DeleteSchemaFunction',
      {
        code,
        runtime,
        role,
        handler: 'delete_schema.handler',
      }
    );

    this.listSchemaArnsFunction = new lambda.Function(
      this,
      'ListSchemaArnsFunction',
      {
        code,
        runtime,
        role,
        handler: 'list_schema_arns.handler',
        timeout: cdk.Duration.seconds(15),
      }
    );

    this.listSolutionVersionArnsFunction = new lambda.Function(
      this,
      'ListSolutionVersionArnsFunction',
      {
        code,
        runtime,
        role,
        handler: 'list_solution_version_arns.handler',
        timeout: cdk.Duration.seconds(15),
      }
    );

    this.putEventsFunction = new lambda.Function(this, `PutEventsFunction`, {
      code,
      runtime,
      role,
      handler: 'put_events.handler',
      timeout: cdk.Duration.seconds(10),
    });

    this.createFilterFunction = new lambda.Function(
      this,
      `CreateFilterFunction`,
      {
        code,
        runtime,
        role,
        handler: 'create_filter.handler',
        timeout: cdk.Duration.seconds(10),
      }
    );

    this.deleteFilterFunction = new lambda.Function(
      this,
      `DeleteFilterFunction`,
      {
        code,
        runtime,
        role,
        handler: 'delete_filter.handler',
        timeout: cdk.Duration.seconds(10),
      }
    );

    this.listFilterArnsFunction = new lambda.Function(
      this,
      `ListFilterArnsFunction`,
      {
        code,
        runtime,
        role,
        handler: 'list_filter_arns.handler',
        timeout: cdk.Duration.seconds(10),
      }
    );
  }
}
