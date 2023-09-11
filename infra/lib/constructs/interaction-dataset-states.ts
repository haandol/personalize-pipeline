import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

interface IProps {
  doneTopic: sns.ITopic;
  failTopic: sns.ITopic;
}

interface IStateFunctions {
  datasetFunction: lambda.IFunction;
  datasetImportFunction: lambda.IFunction;
  solutionFunction: lambda.IFunction;
  campaignFunction: lambda.IFunction;
  checkReadyFunction: lambda.IFunction;
}

export class InteractionDatasetStates extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const stateFunctions = this.createSfnFunctions();
    this.stateMachine = this.createStateMachine(props, stateFunctions);
  }

  private createSfnFunctions(): IStateFunctions {
    const lambdaExecutionRole = new iam.Role(
      this,
      'InteractionDatasetLambdaExecutionRole',
      {
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
          { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
        ],
      }
    );

    const personalizeRole = new iam.Role(
      this,
      'InteractionsDatasetPersonalizeRole',
      {
        assumedBy: new iam.ServicePrincipal('personalize.amazonaws.com'),
        managedPolicies: [
          {
            managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
          },
        ],
      }
    );

    const datasetFunction = new lambda.Function(this, 'DatasetFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(
        path.resolve(
          __dirname,
          '..',
          '..',
          'functions',
          'sfn',
          'interactions-dataset'
        )
      ),
      handler: 'create_dataset.handler',
      role: lambdaExecutionRole,
    });

    const datasetImportFunction = new lambda.Function(
      this,
      'DatasetImportFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_7,
        code: lambda.Code.fromAsset(
          path.resolve(
            __dirname,
            '..',
            '..',
            'functions',
            'sfn',
            'interactions-dataset'
          )
        ),
        handler: 'create_dataset_import.handler',
        role: lambdaExecutionRole,
        environment: {
          ROLE_ARN: personalizeRole.roleArn,
        },
      }
    );

    const solutionFunction = new lambda.Function(this, 'SolutionFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(
        path.resolve(
          __dirname,
          '..',
          '..',
          'functions',
          'sfn',
          'interactions-dataset'
        )
      ),
      handler: 'create_solution.handler',
      role: lambdaExecutionRole,
    });

    const campaignFunction = new lambda.Function(this, 'CampaignFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '..', '..', 'functions', 'common')
      ),
      handler: 'create_campaign.handler',
      role: lambdaExecutionRole,
    });

    const checkReadyFunction = new lambda.Function(this, 'CheckReadyFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '..', '..', 'functions', 'common')
      ),
      handler: 'check_ready.handler',
      role: lambdaExecutionRole,
    });

    return {
      datasetFunction,
      datasetImportFunction,
      solutionFunction,
      campaignFunction,
      checkReadyFunction,
    };
  }

  private createStateMachine(
    props: IProps,
    stateFunctions: IStateFunctions
  ): sfn.StateMachine {
    // Common states
    const doneTask = new tasks.SnsPublish(
      this,
      'InteractionsDatasetDonePublishTask',
      {
        topic: props.doneTopic,
        message: sfn.TaskInput.fromJsonPathAt('$'),
      }
    );
    const failTask = new tasks.SnsPublish(
      this,
      'InteractionsDatasetFailPublishTask',
      {
        topic: props.failTopic,
        message: sfn.TaskInput.fromJsonPathAt('$'),
      }
    );
    const checkReadyTask = new tasks.LambdaInvoke(
      this,
      'InteractionsDatasetCheckReadyTask',
      {
        lambdaFunction: stateFunctions.checkReadyFunction,
      }
    );
    const retryCheckReadyTask = new sfn.Choice(
      this,
      'InteractionsDatasetRetryCheckReadyTask',
      {
        inputPath: '$.Payload',
      }
    );
    checkReadyTask.next(retryCheckReadyTask);

    // Worker states
    const datasetTask = new tasks.LambdaInvoke(
      this,
      'InteractionsDatasetDatasetTask',
      {
        lambdaFunction: stateFunctions.datasetFunction,
        outputPath: '$.Payload',
      }
    );
    datasetTask.next(checkReadyTask);
    datasetTask.addCatch(failTask);

    const datasetImportTask = new tasks.LambdaInvoke(
      this,
      'InteractionsDatasetDatasetImportTask',
      {
        lambdaFunction: stateFunctions.datasetImportFunction,
        outputPath: '$.Payload',
      }
    );
    datasetImportTask.next(checkReadyTask);
    datasetImportTask.addCatch(failTask);

    const solutionTask = new tasks.LambdaInvoke(
      this,
      'InteractionsDatasetSolutionTask',
      {
        lambdaFunction: stateFunctions.solutionFunction,
        outputPath: '$.Payload',
      }
    );
    solutionTask.next(checkReadyTask);
    solutionTask.addCatch(failTask);

    const campaignTask = new tasks.LambdaInvoke(
      this,
      'InteractionsDatasetCampaignTask',
      {
        lambdaFunction: stateFunctions.campaignFunction,
        outputPath: '$.Payload',
      }
    );
    campaignTask.next(checkReadyTask);
    campaignTask.addCatch(failTask);

    retryCheckReadyTask
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.stage', 'DATASET'),
          sfn.Condition.stringEquals('$.status', 'ACTIVE')
        ),
        datasetImportTask
      )
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.stage', 'DATASET_IMPORT'),
          sfn.Condition.stringEquals('$.status', 'ACTIVE')
        ),
        solutionTask
      )
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.stage', 'SOLUTION'),
          sfn.Condition.stringEquals('$.status', 'ACTIVE')
        ),
        campaignTask
      )
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.stage', 'CAMPAIGN'),
          sfn.Condition.stringEquals('$.status', 'ACTIVE')
        ),
        doneTask
      )
      .when(sfn.Condition.stringEquals('$.status', 'CREATE FAILED'), failTask)
      .otherwise(
        new sfn.Wait(this, 'WaitForInteractionsDatasetTask', {
          time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
        }).next(checkReadyTask)
      );

    const definition = sfn.Chain.start(datasetTask);
    const role = new iam.Role(this, 'StateMachineRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        },
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AWSLambdaRole',
        },
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess',
        },
      ],
    });
    return new sfn.StateMachine(this, 'InteractionsDatasetStateMachine', {
      stateMachineName: 'InteractionsDatasetStateMachine',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role,
    });
  }
}
