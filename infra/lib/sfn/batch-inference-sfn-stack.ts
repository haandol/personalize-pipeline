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
  batchInferenceFunction: lambda.IFunction;
  checkBatchReadyFunction: lambda.IFunction;
}

export class BatchInferenceSfnStack extends cdk.Stack {
  public readonly stateMachine: sfn.IStateMachine;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    // Common states
    const doneTask = new tasks.SnsPublish(this, 'BatchInferenceDonePublishTask', {
      topic: props.doneTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    });
    const failTask = new tasks.SnsPublish(this, 'BatchInferenceFailPublishTask', {
      topic: props.failTopic,
      message: sfn.TaskInput.fromDataAt('$'),
    });
    const checkReadyTask = new tasks.LambdaInvoke(this, 'BatchInferenceCheckReadyTask', {
      lambdaFunction: props.checkBatchReadyFunction,
    });
    const retryCheckReadyTask = new sfn.Choice(this, 'BatchInferenceRetryCheckReadyTask', {
      inputPath: '$.Payload',
    });
    checkReadyTask.next(retryCheckReadyTask);

    // Worker states
    const batchInferenceTask = new tasks.LambdaInvoke(this, 'BatchInferenceTask', {
      lambdaFunction: props.batchInferenceFunction,
      outputPath: '$.Payload',
    });
    batchInferenceTask.next(checkReadyTask);
    batchInferenceTask.addCatch(failTask);

    retryCheckReadyTask
      .when(sfn.Condition.and(
        sfn.Condition.stringEquals('$.status', 'ACTIVE'),
      ), doneTask)
      .when(sfn.Condition.stringEquals('$.status', 'CREATE FAILED'), failTask)
      .otherwise(new sfn.Wait(this, 'WaitForBatchInferenceTask', {
        time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
      }).next(checkReadyTask));

    const definition = sfn.Chain.start(batchInferenceTask);
    this.stateMachine = new sfn.StateMachine(this, 'BatchInferenceStateMachine', {
      stateMachineName: 'BatchInferenceStateMachine',
      definition,
      role: props.sfnExecutionRole,
    });
  }

}