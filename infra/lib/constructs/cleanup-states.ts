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
  fetchArnFunction: lambda.IFunction;
  deleteResourceFunction: lambda.IFunction;
  checkDeleteFunction: lambda.IFunction;
}

export class CleanupStates extends cdk.Construct {
  public readonly stateMachine: sfn.StateMachine

  constructor(scope: cdk.Construct, id: string, props: IProps) {
    super(scope, id)

    const stateFunctions = this.createSfnFunctions()
    this.stateMachine = this.createStateMachine(props, stateFunctions)
  }

  private createSfnFunctions(): IStateFunctions {
    const lambdaExecutionRole = new iam.Role(this, 'CleanupLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' },
      ],
    });

    const fetchArnFunction = new lambda.Function(this, 'FetchArnFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'cleanup')),
      handler: 'fetch_arn.handler',
      role: lambdaExecutionRole,
    });

    const deleteResourceFunction = new lambda.Function(this, 'DeleteResourceFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'cleanup')),
      handler: 'delete_resource.handler',
      role: lambdaExecutionRole,
    });

    const checkDeleteFunction = new lambda.Function(this, 'CheckDeleteFunction', {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset(path.resolve(__dirname, '..', '..', 'functions', 'sfn', 'cleanup')),
      handler: 'check_delete.handler',
      role: lambdaExecutionRole,
    });

    return {
      fetchArnFunction,
      deleteResourceFunction,
      checkDeleteFunction,
    }
  }

  private createStateMachine(props: IProps, stateFunctions: IStateFunctions): sfn.StateMachine {
    // Common states
    const doneTask = new tasks.SnsPublish(this, 'CleanupDonePublishTask', {
      topic: props.doneTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    });
    const failTask = new tasks.SnsPublish(this, 'CleanupFailPublishTask', {
      topic: props.failTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    });
    const checkDeleteTask = new tasks.LambdaInvoke(this, 'CheckDeleteTask', {
      lambdaFunction: stateFunctions.checkDeleteFunction,
    });
    const retryCheckDeleteTask = new sfn.Choice(this, 'RetryCheckDeleteTask', {
      inputPath: '$.Payload',
    });
    checkDeleteTask.next(retryCheckDeleteTask);

    // Define work states
    const fetchArnTask = new tasks.LambdaInvoke(this, 'FetchArnTask', {
      lambdaFunction: stateFunctions.fetchArnFunction,
      outputPath: '$.Payload',
    });
    fetchArnTask.addCatch(failTask);

    const deleteCampaignTask = new tasks.LambdaInvoke(this, 'DeleteCampaignTask', {
      lambdaFunction: stateFunctions.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteCampaignTask.next(checkDeleteTask);
    deleteCampaignTask.addCatch(failTask);

    const deleteSolutionTask = new tasks.LambdaInvoke(this, 'DeleteSolutionTask', {
      lambdaFunction: stateFunctions.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteSolutionTask.next(checkDeleteTask);
    deleteSolutionTask.addCatch(failTask);

    const deleteEventTrackerTask = new tasks.LambdaInvoke(this, 'DeleteEventTrackerTask', {
      lambdaFunction: stateFunctions.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteEventTrackerTask.next(checkDeleteTask);
    deleteEventTrackerTask.addCatch(failTask);

    const deleteDatasetTask = new tasks.LambdaInvoke(this, 'DeleteDatasetTask', {
      lambdaFunction: stateFunctions.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteDatasetTask.next(checkDeleteTask);
    deleteDatasetTask.addCatch(failTask);

    const deleteSchemaTask = new tasks.LambdaInvoke(this, 'DeleteSchemaTask', {
      lambdaFunction: stateFunctions.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteSchemaTask.next(checkDeleteTask);
    deleteSchemaTask.addCatch(failTask);

    const deleteDatasetGroupTask = new tasks.LambdaInvoke(this, 'DeleteDatasetGroupTask', {
      lambdaFunction: stateFunctions.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteDatasetGroupTask.next(doneTask);
    deleteDatasetGroupTask.addCatch(failTask);

    // Define retry state transition
    retryCheckDeleteTask
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'CAMPAIGN'),
        sfn.Condition.stringEquals('$.status', 'DELETED'),
      ), deleteSolutionTask)
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'SOLUTION'),
        sfn.Condition.stringEquals('$.status', 'DELETED'),
      ), deleteEventTrackerTask)
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'EVENT_TRACKER'),
        sfn.Condition.stringEquals('$.status', 'DELETED'),
      ), deleteDatasetTask)
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'DATASET'),
        sfn.Condition.stringEquals('$.status', 'DELETED'),
      ), deleteSchemaTask)
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'SCHEMA'),
        sfn.Condition.stringEquals('$.status', 'DELETED'),
      ), deleteDatasetGroupTask)
      .otherwise(new sfn.Wait(this, 'WaitForDeleteTask', {
        time: sfn.WaitTime.duration(cdk.Duration.seconds(30)),
      }).next(checkDeleteTask));

    const definition = sfn.Chain
      .start(fetchArnTask)
      .next(deleteCampaignTask);
    const role = new iam.Role(this, 'StateMachineRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaRole' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonPersonalizeFullAccess' },
      ],
    });
    return new sfn.StateMachine(this, 'CleanupStateMachine', {
      stateMachineName: 'CleanupStateMachine',
      definition,
      role,
      timeout: cdk.Duration.hours(10),
    });
  }
} 