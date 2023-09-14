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
  datasetGroupFunction: lambda.IFunction;
  datasetFunction: lambda.IFunction;
  datasetImportFunction: lambda.IFunction;
  itemDatasetFunction: lambda.IFunction;
  itemDatasetImportFunction: lambda.IFunction;
  userDatasetFunction: lambda.IFunction;
  userDatasetImportFunction: lambda.IFunction;
  recommenderFunction: lambda.IFunction;
  checkReadyFunction: lambda.IFunction;
}

export class UsecaseStates extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const stateFunctions = this.createSfnFunctions();
    this.stateMachine = this.createStateMachine(props, stateFunctions);
  }

  private createSfnFunctions(): IStateFunctions {
    const usecaseRole = new iam.Role(this, 'UsecaseRole', {
      assumedBy: new iam.ServicePrincipal('personalize.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
        },
      ],
    });

    const lambdaExecutionRole = new iam.Role(
      this,
      'UsecaseLambdaExecutionRole',
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

    const datasetGroupFunction = new lambda.Function(
      this,
      'DatasetGroupFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'usecase')
        ),
        handler: 'create_dataset_group.handler',
        role: lambdaExecutionRole,
      }
    );

    const datasetFunction = new lambda.Function(this, 'DatasetFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'usecase')
      ),
      handler: 'create_dataset.handler',
      role: lambdaExecutionRole,
    });

    const datasetImportFunction = new lambda.Function(
      this,
      'DatasetImportFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'usecase')
        ),
        handler: 'create_dataset_import.handler',
        role: lambdaExecutionRole,
        environment: {
          ROLE_ARN: usecaseRole.roleArn,
        },
      }
    );

    const itemDatasetFunction = new lambda.Function(
      this,
      'ItemDatasetFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'usecase')
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
          path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'usecase')
        ),
        handler: 'create_item_dataset_import.handler',
        role: lambdaExecutionRole,
        environment: {
          ROLE_ARN: usecaseRole.roleArn,
        },
      }
    );

    const userDatasetFunction = new lambda.Function(
      this,
      'UserDatasetFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'usecase')
        ),
        handler: 'create_user_dataset.handler',
        role: lambdaExecutionRole,
      }
    );

    const userDatasetImportFunction = new lambda.Function(
      this,
      'UserDatasetImportFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'usecase')
        ),
        handler: 'create_user_dataset_import.handler',
        role: lambdaExecutionRole,
        environment: {
          ROLE_ARN: usecaseRole.roleArn,
        },
      }
    );

    const recommenderFunction = new lambda.Function(
      this,
      'RecommenderFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'usecase')
        ),
        handler: 'create_recommender.handler',
        role: lambdaExecutionRole,
      }
    );

    const checkReadyFunction = new lambda.Function(this, 'CheckReadyFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '..', '..', 'functions', 'common')
      ),
      handler: 'check_ready.handler',
      role: lambdaExecutionRole,
    });

    return {
      datasetGroupFunction,
      datasetFunction,
      datasetImportFunction,
      itemDatasetFunction,
      itemDatasetImportFunction,
      userDatasetFunction,
      userDatasetImportFunction,
      recommenderFunction,
      checkReadyFunction,
    };
  }

  private createStateMachine(
    props: IProps,
    stateFunctions: IStateFunctions
  ): sfn.StateMachine {
    // Common states
    const doneTask = new tasks.SnsPublish(this, 'UsecaseDonePublishTask', {
      topic: props.doneTopic,
      message: sfn.TaskInput.fromJsonPathAt('$'),
    });
    const failTask = new tasks.SnsPublish(this, 'UsecaseFailPublishTask', {
      topic: props.failTopic,
      message: sfn.TaskInput.fromJsonPathAt('$'),
    });
    const checkReadyTask = new tasks.LambdaInvoke(
      this,
      'UsecaseCheckReadyTask',
      {
        lambdaFunction: stateFunctions.checkReadyFunction,
      }
    );
    const retryCheckReadyTask = new sfn.Choice(
      this,
      'UsecaseRetryCheckReadyTask',
      {
        inputPath: '$.Payload',
      }
    );
    checkReadyTask.next(retryCheckReadyTask);

    // Worker states
    const datasetGroupTask = new tasks.LambdaInvoke(
      this,
      'UsecaseDatasetGroupTask',
      {
        lambdaFunction: stateFunctions.datasetGroupFunction,
        outputPath: '$.Payload',
      }
    );
    datasetGroupTask.next(checkReadyTask);
    datasetGroupTask.addCatch(failTask);

    const datasetTask = new tasks.LambdaInvoke(this, 'UsecaseDatasetTask', {
      lambdaFunction: stateFunctions.datasetFunction,
      outputPath: '$.Payload',
    });
    datasetTask.next(checkReadyTask);
    datasetTask.addCatch(failTask);

    const datasetImportTask = new tasks.LambdaInvoke(
      this,
      'UsecaseDatasetImportTask',
      {
        lambdaFunction: stateFunctions.datasetImportFunction,
        outputPath: '$.Payload',
      }
    );
    datasetImportTask.next(checkReadyTask);
    datasetImportTask.addCatch(failTask);

    const itemDatasetTask = new tasks.LambdaInvoke(
      this,
      'UsecaseDatasetItemTask',
      {
        lambdaFunction: stateFunctions.itemDatasetFunction,
        outputPath: '$.Payload',
      }
    );
    itemDatasetTask.next(checkReadyTask);
    itemDatasetTask.addCatch(failTask);

    const itemDatasetImportTask = new tasks.LambdaInvoke(
      this,
      'UsecaseDatasetItemImportTask',
      {
        lambdaFunction: stateFunctions.itemDatasetImportFunction,
        outputPath: '$.Payload',
      }
    );
    itemDatasetImportTask.next(checkReadyTask);
    itemDatasetImportTask.addCatch(failTask);

    const userDatasetTask = new tasks.LambdaInvoke(
      this,
      'UsecaseDatasetUserTask',
      {
        lambdaFunction: stateFunctions.userDatasetFunction,
        outputPath: '$.Payload',
      }
    );
    userDatasetTask.next(checkReadyTask);
    userDatasetTask.addCatch(failTask);

    const userDatasetImportTask = new tasks.LambdaInvoke(
      this,
      'UsecaseDatasetUserImportTask',
      {
        lambdaFunction: stateFunctions.userDatasetImportFunction,
        outputPath: '$.Payload',
      }
    );
    userDatasetImportTask.next(checkReadyTask);
    userDatasetImportTask.addCatch(failTask);

    const recommenderTask = new tasks.LambdaInvoke(
      this,
      'UsecaseRecommenderTask',
      {
        lambdaFunction: stateFunctions.recommenderFunction,
        outputPath: '$.Payload',
      }
    );
    recommenderTask.next(checkReadyTask);
    recommenderTask.addCatch(failTask);

    retryCheckReadyTask
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.stage', 'DATASET_GROUP'),
          sfn.Condition.stringEquals('$.status', 'ACTIVE')
        ),
        datasetTask
      )
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
        itemDatasetTask
      )
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
        recommenderTask
      )
      .when(
        sfn.Condition.and(
          sfn.Condition.stringEquals('$.stage', 'RECOMMENDER'),
          sfn.Condition.stringEquals('$.status', 'ACTIVE')
        ),
        doneTask
      )
      .when(sfn.Condition.stringEquals('$.status', 'CREATE FAILED'), failTask)
      .otherwise(
        new sfn.Wait(this, 'WaitForUsecaseTask', {
          time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
        }).next(checkReadyTask)
      );

    const definition = sfn.Chain.start(datasetGroupTask);
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
    return new sfn.StateMachine(this, 'UsecaseStateMachine', {
      stateMachineName: 'UsecaseStateMachine',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role,
    });
  }
}
