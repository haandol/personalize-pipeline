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
  batchSegmentFunction: lambda.IFunction;
  checkBatchReadyFunction: lambda.IFunction;
}

export class BatchSegmentStates extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const stateFunctions = this.createSfnFunctions();
    this.stateMachine = this.createStateMachine(props, stateFunctions);
  }

  private createSfnFunctions(): IStateFunctions {
    const lambdaExecutionRole = new iam.Role(
      this,
      'BatchSegmentLambdaExecutionRole',
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

    const role = new iam.Role(this, 'BatchSegmentRole', {
      assumedBy: new iam.ServicePrincipal('personalize.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess',
        },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
      ],
    });

    const batchSegmentFunction = new lambda.Function(
      this,
      'BatchSegmentFunction',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
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
        handler: 'create_batch_segment.handler',
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
        runtime: lambda.Runtime.PYTHON_3_11,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, '..', '..', 'functions', 'common')
        ),
        handler: 'check_batch_ready.handler',
        role: lambdaExecutionRole,
      }
    );

    return {
      batchSegmentFunction,
      checkBatchReadyFunction,
    };
  }

  private createStateMachine(
    props: IProps,
    stateFunctions: IStateFunctions
  ): sfn.StateMachine {
    // Common states
    const doneTask = new tasks.SnsPublish(this, 'BatchSegmentDonePublishTask', {
      topic: props.doneTopic,
      message: sfn.TaskInput.fromJsonPathAt('$'),
    });
    const failTask = new tasks.SnsPublish(this, 'BatchSegmentFailPublishTask', {
      topic: props.failTopic,
      message: sfn.TaskInput.fromJsonPathAt('$'),
    });
    const checkReadyTask = new tasks.LambdaInvoke(
      this,
      'BatchSegmentCheckReadyTask',
      {
        lambdaFunction: stateFunctions.checkBatchReadyFunction,
      }
    );
    const retryCheckReadyTask = new sfn.Choice(
      this,
      'BatchSegmentRetryCheckReadyTask',
      {
        inputPath: '$.Payload',
      }
    );
    checkReadyTask.next(retryCheckReadyTask);

    // Worker states
    const batchSegmentTask = new tasks.LambdaInvoke(this, 'BatchSegmentTask', {
      lambdaFunction: stateFunctions.batchSegmentFunction,
      outputPath: '$.Payload',
    });
    batchSegmentTask.next(checkReadyTask);
    batchSegmentTask.addCatch(failTask);

    retryCheckReadyTask
      .when(
        sfn.Condition.and(sfn.Condition.stringEquals('$.status', 'ACTIVE')),
        doneTask
      )
      .when(sfn.Condition.stringEquals('$.status', 'CREATE FAILED'), failTask)
      .otherwise(
        new sfn.Wait(this, 'WaitForBatchSegmentTask', {
          time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
        }).next(checkReadyTask)
      );

    const definition = sfn.Chain.start(batchSegmentTask);
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
    return new sfn.StateMachine(this, 'BatchSegmentStateMachine', {
      stateMachineName: 'BatchSegmentStateMachine',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role,
    });
  }
}
