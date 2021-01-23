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

import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import * as sns from '@aws-cdk/aws-sns'
import * as lambda from '@aws-cdk/aws-lambda'
import * as sfn from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'

interface IProps {
  doneTopic: sns.ITopic
  failTopic: sns.ITopic
}

interface IStateFunctions {
  datasetGroupFunction: lambda.IFunction
  datasetFunction: lambda.IFunction
  solutionFunction: lambda.IFunction
  campaignFunction: lambda.IFunction
  checkReadyFunction: lambda.IFunction
}

export class SimsStates extends cdk.Construct {
  public readonly stateMachine: sfn.StateMachine

  constructor(scope: cdk.Construct, id: string, props: IProps) {
    super(scope, id)

    const stateFunctions = this.createSfnFunctions()
    this.stateMachine = this.createStateMachine(props, stateFunctions)
  }

  private createSfnFunctions(): IStateFunctions {
    const personalizeRole = new iam.Role(this, 'SimsPersonalizeRole', {
      assumedBy: new iam.ServicePrincipal('personalize.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess' }
      ],
    })
    const lambdaExecutionRole = new iam.Role(this, 'SimsLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonSESFullAccess' },
      ],
    })

    const datasetGroupFunction = new lambda.Function(this, 'DatasetGroupFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'sims')),
      handler: 'create_dataset_group.handler',
      role: lambdaExecutionRole,
    })

    const datasetFunction = new lambda.Function(this, 'DatasetFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'sims')),
      handler: 'create_dataset.handler',
      role: lambdaExecutionRole,
      environment: {
        ROLE_ARN: personalizeRole.roleArn,
      },
    })

    const solutionFunction = new lambda.Function(this, 'SolutionFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'sims')),
      handler: 'create_solution.handler',
      role: lambdaExecutionRole,
    })

    const campaignFunction = new lambda.Function(this, 'CampaignFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'common')),
      handler: 'create_campaign.handler',
      role: lambdaExecutionRole,
    })

    const checkReadyFunction = new lambda.Function(this, 'CheckReadyFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'common')),
      handler: 'check_ready.handler',
      role: lambdaExecutionRole,
    })

    return {
      datasetGroupFunction,
      datasetFunction,
      solutionFunction,
      campaignFunction,
      checkReadyFunction,
    }
  }

  private createStateMachine(props: IProps, stateFunctions: IStateFunctions): sfn.StateMachine {
    // Common states
    const doneTask = new tasks.SnsPublish(this, 'SimsDonePublishTask', {
      topic: props.doneTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    })
    const failTask = new tasks.SnsPublish(this, 'SimsFailPublishTask', {
      topic: props.failTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    })
    const checkReadyTask = new tasks.LambdaInvoke(this, 'SimsCheckReadyTask', {
      lambdaFunction: stateFunctions.checkReadyFunction,
    })
    const retryCheckReadyTask = new sfn.Choice(this, 'SimsRetryCheckReadyTask', {
      inputPath: '$.Payload',
    })
    checkReadyTask.next(retryCheckReadyTask)

    // Worker states
    const datasetGroupTask = new tasks.LambdaInvoke(this, 'SimsDatasetGroupTask', {
      lambdaFunction: stateFunctions.datasetGroupFunction,
      outputPath: '$.Payload',
    })
    datasetGroupTask.next(checkReadyTask)
    datasetGroupTask.addCatch(failTask)

    const datasetTask = new tasks.LambdaInvoke(this, 'SimsDatasetTask', {
      lambdaFunction: stateFunctions.datasetFunction,
      outputPath: '$.Payload',
    })
    datasetTask.next(checkReadyTask)
    datasetTask.addCatch(failTask)

    const solutionTask = new tasks.LambdaInvoke(this, 'SimsSolutionTask', {
      lambdaFunction: stateFunctions.solutionFunction,
      outputPath: '$.Payload',
    })
    solutionTask.next(checkReadyTask)
    solutionTask.addCatch(failTask)

    const campaignTask = new tasks.LambdaInvoke(this, 'SimsCampaignTask', {
      lambdaFunction: stateFunctions.campaignFunction,
      outputPath: '$.Payload',
    })
    campaignTask.next(checkReadyTask)
    campaignTask.addCatch(failTask)

    retryCheckReadyTask
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'DATASET_GROUP'),
        sfn.Condition.stringEquals('$.status', 'ACTIVE'),
      ), datasetTask)
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'DATASET_IMPORT'),
        sfn.Condition.stringEquals('$.status', 'ACTIVE'),
      ), solutionTask)
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'SOLUTION'),
        sfn.Condition.stringEquals('$.status', 'ACTIVE'),
      ), campaignTask)
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'CAMPAIGN'),
        sfn.Condition.stringEquals('$.status', 'ACTIVE'),
      ), doneTask)
      .when(sfn.Condition.stringEquals('$.status', 'CREATE FAILED'), failTask)
      .otherwise(new sfn.Wait(this, 'WaitForSimsTask', {
        time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
      }).next(checkReadyTask))

    const definition = sfn.Chain.start(datasetGroupTask)
    const role = new iam.Role(this, 'StateMachineRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess' },
      ],
    });
    return new sfn.StateMachine(this, 'SimsStateMachine', {
      stateMachineName: 'SimsStateMachine',
      definition,
      role,
    })
  }
} 