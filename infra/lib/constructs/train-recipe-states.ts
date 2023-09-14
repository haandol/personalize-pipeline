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
  solutionFunction: lambda.IFunction;
  campaignFunction: lambda.IFunction;
  checkReadyFunction: lambda.IFunction;
}

export class TrainRecipeStates extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id);

    const stateFunctions = this.createSfnFunctions();
    this.stateMachine = this.createStateMachine(props, stateFunctions);
  }

  private createSfnFunctions(): IStateFunctions {
    const lambdaExecutionRole = new iam.Role(
      this,
      'TrainRecipeLambdaExecutionRole',
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

    const solutionFunction = new lambda.Function(this, 'SolutionFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'train-recipe')
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
    const doneTask = new tasks.SnsPublish(this, 'TrainRecipeDonePublishTask', {
      topic: props.doneTopic,
      message: sfn.TaskInput.fromJsonPathAt('$'),
    });
    const failTask = new tasks.SnsPublish(this, 'TrainRecipeFailPublishTask', {
      topic: props.failTopic,
      message: sfn.TaskInput.fromJsonPathAt('$'),
    });
    const checkReadyTask = new tasks.LambdaInvoke(
      this,
      'TrainRecipeCheckReadyTask',
      {
        lambdaFunction: stateFunctions.checkReadyFunction,
      }
    );
    const retryCheckReadyTask = new sfn.Choice(
      this,
      'TrainRecipeRetryCheckReadyTask',
      {
        inputPath: '$.Payload',
      }
    );
    checkReadyTask.next(retryCheckReadyTask);

    // Worker states
    const solutionTask = new tasks.LambdaInvoke(
      this,
      'TrainRecipeSolutionTask',
      {
        lambdaFunction: stateFunctions.solutionFunction,
        outputPath: '$.Payload',
      }
    );
    solutionTask.next(checkReadyTask);
    solutionTask.addCatch(failTask);

    const campaignTask = new tasks.LambdaInvoke(
      this,
      'TrainRecipeCampaignTask',
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
        new sfn.Wait(this, 'WaitForTrainRecipeTask', {
          time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
        }).next(checkReadyTask)
      );

    const definition = sfn.Chain.start(solutionTask);
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
    return new sfn.StateMachine(this, 'TrainRecipeStateMachine', {
      stateMachineName: 'TrainRecipeStateMachine',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role,
    });
  }
}
