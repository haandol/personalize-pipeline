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
  itemDatasetFunction: lambda.IFunction;
  userDatasetFunction: lambda.IFunction;
  solutionFunction: lambda.IFunction;
  campaignFunction: lambda.IFunction;
  checkReadyFunction: lambda.IFunction;
}

export class UserPersonalizationSfnStack extends cdk.Stack {
  public readonly stateMachine: sfn.IStateMachine;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    // Common states
    const doneTask = new tasks.SnsPublish(this, 'UserPersonalizationDonePublishTask', {
      topic: props.doneTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    });
    const failTask = new tasks.SnsPublish(this, 'UserPersonalizationFailPublishTask', {
      topic: props.failTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    });
    const checkReadyTask = new tasks.LambdaInvoke(this, 'UserPersonalizationCheckReadyTask', {
      lambdaFunction: props.checkReadyFunction,
    });
    const retryCheckReadyTask = new sfn.Choice(this, 'UserPersonalizationRetryCheckReadyTask', {
      inputPath: '$.Payload',
    });
    checkReadyTask.next(retryCheckReadyTask);

    // Worker states
    const datasetGroupTask = new tasks.LambdaInvoke(this, 'UserPersonalizationDatasetGroupTask', {
      lambdaFunction: props.datasetGroupFunction,
      outputPath: '$.Payload',
    });
    datasetGroupTask.next(checkReadyTask);
    datasetGroupTask.addCatch(failTask);

    const datasetTask = new tasks.LambdaInvoke(this, 'UserPersonalizationDatasetTask', {
      lambdaFunction: props.datasetFunction,
      outputPath: '$.Payload',
    });
    datasetTask.next(checkReadyTask);
    datasetTask.addCatch(failTask);

    const itemDatasetTask = new tasks.LambdaInvoke(this, 'UserPersonalizationDatasetItemTask', {
      lambdaFunction: props.itemDatasetFunction,
      outputPath: '$.Payload',
    });
    itemDatasetTask.next(checkReadyTask);
    itemDatasetTask.addCatch(failTask);

    const userDatasetTask = new tasks.LambdaInvoke(this, 'UserPersonalizationDatasetUserTask', {
      lambdaFunction: props.userDatasetFunction,
      outputPath: '$.Payload',
    });
    userDatasetTask.next(checkReadyTask);
    userDatasetTask.addCatch(failTask);

    const solutionTask = new tasks.LambdaInvoke(this, 'UserPersonalizationSolutionTask', {
      lambdaFunction: props.solutionFunction,
      outputPath: '$.Payload',
    });
    solutionTask.next(checkReadyTask);
    solutionTask.addCatch(failTask);

    const campaignTask = new tasks.LambdaInvoke(this, 'UserPersonalizationCampaignTask', {
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
      ), itemDatasetTask)
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'ITEM_DATASET_IMPORT'),
        sfn.Condition.stringEquals('$.status', 'ACTIVE'),
      ), userDatasetTask)
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.stage', 'USER_DATASET_IMPORT'),
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
      .otherwise(new sfn.Wait(this, 'WaitForUserPersonalizationTask', {
        time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
      }).next(checkReadyTask));

    const definition = sfn.Chain.start(datasetGroupTask);
    this.stateMachine = new sfn.StateMachine(this, 'UserPersonalizationStateMachine', {
      stateMachineName: 'UserPersonalizationStateMachine',
      definition,
      role: props.sfnExecutionRole,
    });
  }

}