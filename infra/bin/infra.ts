#!/usr/bin/env node

/* *************************************************************************** *
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

import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { DemoStack } from '../lib/stacks/demo-stack'
import { ApiGatewayStack } from '../lib/stacks/apigateway-stack'
import { CommonStack } from '../lib/stacks/common-stack'
import { SimsStack } from '../lib/stacks/sims-stack'
import { UserPersonalizationStack } from '../lib/stacks/user-personalization-stack'
import { MetadataDatasetStack } from '../lib/stacks/metadata-dataset-stack'
import { BatchInferenceStack } from '../lib/stacks/batch-inference-stack'
import { TrainRecipeStack } from '../lib/stacks/train-recipe-stack'
import { CleanupStack } from '../lib/stacks/cleanup-stack'
import { ApiIntegrationStack } from '../lib/stacks/api-integration-stack'
import { ns, StackProps, AppContext } from '../lib/interfaces/config'

const app = new cdk.App({
  context: AppContext
})

// Only for demo
new DemoStack(app, `${ns}DemoStack`)

// Common
const apiGwStack = new ApiGatewayStack(app, `${ns}ApiGatewayStack`, {
  ...StackProps,
})

const commonStack = new CommonStack(app, `${ns}CommonStack`, StackProps)

const simsStack = new SimsStack(app, `${ns}SimsStack`, {
  ...StackProps,
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
})
simsStack.addDependency(commonStack)

const userPersonalizationStack = new UserPersonalizationStack(app, `${ns}UserPersonalizationStack`, {
  ...StackProps,
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
})
userPersonalizationStack.addDependency(commonStack)

const metadataDatasetStack = new MetadataDatasetStack(app, `${ns}MetadataDatasetStack`, {
  ...StackProps,
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
})
metadataDatasetStack.addDependency(commonStack)

const batchInferenceStack = new BatchInferenceStack(app, `${ns}BatchInferenceStack`, {
  ...StackProps,
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
})
batchInferenceStack.addDependency(commonStack)

const trainRecipeStack = new TrainRecipeStack(app, `${ns}TrainRecipeStack`, {
  ...StackProps,
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
})
trainRecipeStack.addDependency(commonStack)

const cleanupStack = new CleanupStack(app, `${ns}CleanupStack`, {
  ...StackProps,
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
})
cleanupStack.addDependency(commonStack)

// ApiGateway LambdaIntegration
new ApiIntegrationStack(app, `${ns}ApiIntegrationStack`, {
  ...StackProps,
  api: apiGwStack.api,
  requestModels: apiGwStack.apiRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
})