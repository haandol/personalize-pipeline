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
  batchInferenceFunction: lambda.IFunction;
  checkBatchReadyFunction: lambda.IFunction;
}

export class BatchInferenceStates extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const stateFunctions = this.createSfnFunctions();
    this.stateMachine = this.createStateMachine(props, stateFunctions);
  }

  private createSfnFunctions(): IStateFunctions {
    const lambdaExecutionRole = new iam.Role(
      this,
      'BatchInferenceLambdaExecutionRole',
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

    const role = new iam.Role(this, 'BatchInferenceRole', {
      assumedBy: new iam.ServicePrincipal('personalize.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess',
        },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
      ],
    });

    const batchInferenceFunction = new lambda.Function(
      this,
      'BatchInferenceFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_7,
        code: lambda.Code.fromAsset(
          path.resolve(
            __dirname,
            '..',
            '..',
            'functions',
            'sfn',
            'batch-inference'
          )
        ),
        handler: 'create_batch_inference.handler',
        role: lambdaExecutionRole,
        environment: {
          ROLE_ARN: role.roleArn,
        },
      }
    );

    const checkBatchReadyFunction = new lambda.Function(
      this,
      'CheckReadyFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_7,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, '..', '..', 'functions', 'common')
        ),
        handler: 'check_batch_ready.handler',
        role: lambdaExecutionRole,
      }
    );

    return {
      batchInferenceFunction,
      checkBatchReadyFunction,
    };
  }

  private createStateMachine(
    props: IProps,
    stateFunctions: IStateFunctions
  ): sfn.StateMachine {
    // Common states
    const doneTask = new tasks.SnsPublish(
      this,
      'BatchInferenceDonePublishTask',
      {
        topic: props.doneTopic,
        message: sfn.TaskInput.fromJsonPathAt('$'),
      }
    );
    const failTask = new tasks.SnsPublish(
      this,
      'BatchInferenceFailPublishTask',
      {
        topic: props.failTopic,
        message: sfn.TaskInput.fromJsonPathAt('$'),
      }
    );
    const checkReadyTask = new tasks.LambdaInvoke(
      this,
      'BatchInferenceCheckReadyTask',
      {
        lambdaFunction: stateFunctions.checkBatchReadyFunction,
      }
    );
    const retryCheckReadyTask = new sfn.Choice(
      this,
      'BatchInferenceRetryCheckReadyTask',
      {
        inputPath: '$.Payload',
      }
    );
    checkReadyTask.next(retryCheckReadyTask);

    // Worker states
    const batchInferenceTask = new tasks.LambdaInvoke(
      this,
      'BatchInferenceTask',
      {
        lambdaFunction: stateFunctions.batchInferenceFunction,
        outputPath: '$.Payload',
      }
    );
    batchInferenceTask.next(checkReadyTask);
    batchInferenceTask.addCatch(failTask);

    retryCheckReadyTask
      .when(
        sfn.Condition.and(sfn.Condition.stringEquals('$.status', 'ACTIVE')),
        doneTask
      )
      .when(sfn.Condition.stringEquals('$.status', 'CREATE FAILED'), failTask)
      .otherwise(
        new sfn.Wait(this, 'WaitForBatchInferenceTask', {
          time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
        }).next(checkReadyTask)
      );

    const definition = sfn.Chain.start(batchInferenceTask);
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
    return new sfn.StateMachine(this, 'BatchInferenceStateMachine', {
      stateMachineName: 'BatchInferenceStateMachine',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role,
    });
  }
}
