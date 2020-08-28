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
  datasetGroupFunction: lambda.IFunction;
  datasetFunction: lambda.IFunction;
  solutionFunction: lambda.IFunction;
  campaignFunction: lambda.IFunction;
  checkReadyFunction: lambda.IFunction;
}

export class RankingSfnStack extends cdk.Stack {
  public readonly stateMachine: sfn.IStateMachine;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    // Common states
    const doneTask = new tasks.SnsPublish(this, 'RankingDonePublishTask', {
      topic: props.doneTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    });
    const failTask = new tasks.SnsPublish(this, 'RankingFailPublishTask', {
      topic: props.failTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    });
    const checkReadyTask = new tasks.LambdaInvoke(this, 'RankingCheckReadyTask', {
      lambdaFunction: props.checkReadyFunction,
    });
    const retryCheckReadyTask = new sfn.Choice(this, 'RankingRetryCheckReadyTask', {
      inputPath: '$.Payload',
    });
    checkReadyTask.next(retryCheckReadyTask);

    // Worker states
    const datasetGroupTask = new tasks.LambdaInvoke(this, 'RankingDatasetGroupTask', {
      lambdaFunction: props.datasetGroupFunction,
      outputPath: '$.Payload',
    });
    datasetGroupTask.next(checkReadyTask);
    datasetGroupTask.addCatch(failTask);

    const datasetTask = new tasks.LambdaInvoke(this, 'RankingDatasetTask', {
      lambdaFunction: props.datasetFunction,
      outputPath: '$.Payload',
    });
    datasetTask.next(checkReadyTask);
    datasetTask.addCatch(failTask);

    const solutionTask = new tasks.LambdaInvoke(this, 'RankingSolutionTask', {
      lambdaFunction: props.solutionFunction,
      outputPath: '$.Payload',
    });
    solutionTask.next(checkReadyTask);
    solutionTask.addCatch(failTask);

    const campaignTask = new tasks.LambdaInvoke(this, 'RankingCampaignTask', {
      lambdaFunction: props.campaignFunction,
      outputPath: '$.Payload',
    });
    campaignTask.next(checkReadyTask);
    campaignTask.addCatch(failTask);

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
      .otherwise(new sfn.Wait(this, 'WaitForRankingTask', {
        time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
      }).next(checkReadyTask));

    const definition = sfn.Chain.start(datasetGroupTask);
    this.stateMachine = new sfn.StateMachine(this, 'RankingStateMachine', {
      stateMachineName: 'RankingStateMachine',
      definition,
      role: props.sfnExecutionRole,
    });
  }

}