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

import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sns from '@aws-cdk/aws-sns';
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks';

interface Props extends cdk.StackProps {
  doneTopic: sns.ITopic;
  failTopic: sns.ITopic;
  sfnExecutionRole: iam.IRole;
  fetchArnFunction: lambda.IFunction;
  deleteResourceFunction: lambda.IFunction;
  checkDeleteFunction: lambda.IFunction;
}

export class CleanupSfnStack extends cdk.Stack {
  public readonly stateMachine: sfn.IStateMachine;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

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
      lambdaFunction: props.checkDeleteFunction,
    });
    const retryCheckDeleteTask = new sfn.Choice(this, 'RetryCheckDeleteTask', {
      inputPath: '$.Payload',
    });
    checkDeleteTask.next(retryCheckDeleteTask);

    // Define work states
    const fetchArnTask = new tasks.LambdaInvoke(this, 'FetchArnTask', {
      lambdaFunction: props.fetchArnFunction,
      outputPath: '$.Payload',
    });
    fetchArnTask.addCatch(failTask);

    const deleteCampaignTask = new tasks.LambdaInvoke(this, 'DeleteCampaignTask', {
      lambdaFunction: props.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteCampaignTask.next(checkDeleteTask);
    deleteCampaignTask.addCatch(failTask);

    const deleteSolutionTask = new tasks.LambdaInvoke(this, 'DeleteSolutionTask', {
      lambdaFunction: props.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteSolutionTask.next(checkDeleteTask);
    deleteSolutionTask.addCatch(failTask);

    const deleteEventTrackerTask = new tasks.LambdaInvoke(this, 'DeleteEventTrackerTask', {
      lambdaFunction: props.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteEventTrackerTask.next(checkDeleteTask);
    deleteEventTrackerTask.addCatch(failTask);

    const deleteDatasetTask = new tasks.LambdaInvoke(this, 'DeleteDatasetTask', {
      lambdaFunction: props.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteDatasetTask.next(checkDeleteTask);
    deleteDatasetTask.addCatch(failTask);

    const deleteSchemaTask = new tasks.LambdaInvoke(this, 'DeleteSchemaTask', {
      lambdaFunction: props.deleteResourceFunction,
      outputPath: '$.Payload',
    });
    deleteSchemaTask.next(checkDeleteTask);
    deleteSchemaTask.addCatch(failTask);

    const deleteDatasetGroupTask = new tasks.LambdaInvoke(this, 'DeleteDatasetGroupTask', {
      lambdaFunction: props.deleteResourceFunction,
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
    this.stateMachine = new sfn.StateMachine(this, 'CleanupStateMachine', {
      stateMachineName: 'CleanupStateMachine',
      definition,
      role: props.sfnExecutionRole,
      timeout: cdk.Duration.hours(10),
    });
  }

}