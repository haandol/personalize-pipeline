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
  itemDatasetFunction: lambda.IFunction;
  itemDatasetImportFunction: lambda.IFunction;
  userDatasetFunction: lambda.IFunction;
  userDatasetImportFunction: lambda.IFunction;
  solutionFunction: lambda.IFunction;
  campaignFunction: lambda.IFunction;
  checkReadyFunction: lambda.IFunction;
}

export class MetadataDatasetStates extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const stateFunctions = this.createSfnFunctions();
    this.stateMachine = this.createStateMachine(props, stateFunctions);
  }

  private createSfnFunctions(): IStateFunctions {
    const lambdaExecutionRole = new iam.Role(
      this,
      'MetadataDatasetLambdaExecutionRole',
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
      'MetadataDatasetPersonalizeRole',
      {
        assumedBy: new iam.ServicePrincipal('personalize.amazonaws.com'),
        managedPolicies: [
          {
            managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
          },
        ],
      }
    );

    const itemDatasetFunction = new lambda.Function(
      this,
      'ItemDatasetFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(
            __dirname,
            '..',
            '..',
            'functions',
            'sfn',
            'metadata-dataset'
          )
        ),
        handler: 'create_item_dataset.handler',
        role: lambdaExecutionRole,
      }
    );

    const itemDatasetImportFunction = new lambda.Function(
      this,
      'ItemDatasetImportFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(
            __dirname,
            '..',
            '..',
            'functions',
            'sfn',
            'metadata-dataset'
          )
        ),
        handler: 'create_item_dataset_import.handler',
        role: lambdaExecutionRole,
        environment: {
          ROLE_ARN: personalizeRole.roleArn,
        },
      }
    );

    const userDatasetFunction = new lambda.Function(
      this,
      'UserDatasetFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(
            __dirname,
            '..',
            '..',
            'functions',
            'sfn',
            'metadata-dataset'
          )
        ),
        handler: 'create_user_dataset.handler',
        role: lambdaExecutionRole,
        environment: {
          ROLE_ARN: personalizeRole.roleArn,
        },
        timeout: cdk.Duration.seconds(30),
      }
    );

    const userDatasetImportFunction = new lambda.Function(
      this,
      'UserDatasetImportFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(
            __dirname,
            '..',
            '..',
            'functions',
            'sfn',
            'metadata-dataset'
          )
        ),
        handler: 'create_user_dataset_import.handler',
        role: lambdaExecutionRole,
        environment: {
          ROLE_ARN: personalizeRole.roleArn,
        },
      }
    );

    const solutionFunction = new lambda.Function(this, 'SolutionFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        path.resolve(
          __dirname,
          '..',
          '..',
          'functions',
          'sfn',
          'metadata-dataset'
        )
      ),
      handler: 'create_solution.handler',
      role: lambdaExecutionRole,
    });

    const campaignFunction = new lambda.Function(this, 'CampaignFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '..', '..', 'functions', 'common')
      ),
      handler: 'create_campaign.handler',
      role: lambdaExecutionRole,
    });

    const checkReadyFunction = new lambda.Function(this, 'CheckReadyFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '..', '..', 'functions', 'common')
      ),
      handler: 'check_ready.handler',
      role: lambdaExecutionRole,
    });

    return {
      itemDatasetFunction,
      itemDatasetImportFunction,
      userDatasetFunction,
      userDatasetImportFunction,
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
      'MetadataDatasetDonePublishTask',
      {
        topic: props.doneTopic,
        message: sfn.TaskInput.fromJsonPathAt('$'),
      }
    );
    const failTask = new tasks.SnsPublish(
      this,
      'MetadataDatasetFailPublishTask',
      {
        topic: props.failTopic,
        message: sfn.TaskInput.fromJsonPathAt('$'),
      }
    );
    const checkReadyTask = new tasks.LambdaInvoke(
      this,
      'MetadataDatasetCheckReadyTask',
      {
        lambdaFunction: stateFunctions.checkReadyFunction,
      }
    );
    const retryCheckReadyTask = new sfn.Choice(
      this,
      'MetadataDatasetRetryCheckReadyTask',
      {
        inputPath: '$.Payload',
      }
    );
    checkReadyTask.next(retryCheckReadyTask);

    // Worker states
    const itemDatasetTask = new tasks.LambdaInvoke(
      this,
      'MetadataDatasetDatasetItemTask',
      {
        lambdaFunction: stateFunctions.itemDatasetFunction,
        outputPath: '$.Payload',
      }
    );
    itemDatasetTask.next(checkReadyTask);
    itemDatasetTask.addCatch(failTask);

    const itemDatasetImportTask = new tasks.LambdaInvoke(
      this,
      'MetadataDatasetDatasetItemImportTask',
      {
        lambdaFunction: stateFunctions.itemDatasetImportFunction,
        outputPath: '$.Payload',
      }
    );
    itemDatasetImportTask.next(checkReadyTask);
    itemDatasetImportTask.addCatch(failTask);

    const userDatasetTask = new tasks.LambdaInvoke(
      this,
      'MetadataDatasetDatasetUserTask',
      {
        lambdaFunction: stateFunctions.userDatasetFunction,
        outputPath: '$.Payload',
      }
    );
    userDatasetTask.next(checkReadyTask);
    userDatasetTask.addCatch(failTask);

    const userDatasetImportTask = new tasks.LambdaInvoke(
      this,
      'MetadataDatasetDatasetUserImportTask',
      {
        lambdaFunction: stateFunctions.userDatasetImportFunction,
        outputPath: '$.Payload',
      }
    );
    userDatasetImportTask.next(checkReadyTask);
    userDatasetImportTask.addCatch(failTask);

    const solutionTask = new tasks.LambdaInvoke(
      this,
      'MetadataDatasetSolutionTask',
      {
        lambdaFunction: stateFunctions.solutionFunction,
        outputPath: '$.Payload',
      }
    );
    solutionTask.next(checkReadyTask);
    solutionTask.addCatch(failTask);

    const campaignTask = new tasks.LambdaInvoke(
      this,
      'MetadataDatasetCampaignTask',
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
          sfn.Condition.stringEquals('$.stage', 'ITEM_DATASET'),
          sfn.Condition.stringEquals('$.status', 'ACTIVE')
        ),
        itemDatasetImportTask
      )
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.stage', 'ITEM_DATASET_IMPORT'),
          sfn.Condition.stringEquals('$.status', 'ACTIVE')
        ),
        userDatasetTask
      )
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.stage', 'USER_DATASET'),
          sfn.Condition.stringEquals('$.status', 'ACTIVE')
        ),
        userDatasetImportTask
      )
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.stage', 'USER_DATASET_IMPORT'),
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
        new sfn.Wait(this, 'WaitForMetadataDatasetTask', {
          time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
        }).next(checkReadyTask)
      );

    const definition = sfn.Chain.start(itemDatasetTask);
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
    return new sfn.StateMachine(this, 'MetadataDatasetStateMachine', {
      stateMachineName: 'MetadataDatasetStateMachine',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role,
    });
  }
}
