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

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { VpcStack } from '../lib/vpc-stack';
import { ApiGatewayStack } from '../lib/apigateway-stack';
import { CommonLambdaStack } from '../lib/lambda/common-lambda-stack';
import { ApiLambdaStack } from '../lib/lambda/api-lambda-stack';
import { SimsLambdaStack } from '../lib/lambda/sims-lambda-stack';
import { UserPersonalizationLambdaStack } from '../lib/lambda/user-personalization-lambda-stack';
import { MetadataDatasetLambdaStack } from '../lib/lambda/metadata-dataset-lambda-stack';
import { InteractionsDatasetLambdaStack } from '../lib/lambda/interactions-dataset-lambda-stack';
import { RankingLambdaStack } from '../lib/lambda/ranking-lambda-stack';
import { BatchInferenceLambdaStack } from '../lib/lambda/batch-inference-lambda-stack';
import { TrainRecipeLambdaStack } from '../lib/lambda/train-recipe-lambda-stack';
import { CleanupLambdaStack } from '../lib/lambda/cleanup-lambda-stack';
import { CommonSfnStack } from '../lib/sfn/common-sfn-stack';
import { SimsSfnStack } from '../lib/sfn/sims-sfn-stack';
import { UserPersonalizationSfnStack } from '../lib/sfn/user-personalization-sfn-stack';
import { MetadataDatasetSfnStack } from '../lib/sfn/metadata-dataset-sfn-stack';
import { InteractionsDatasetSfnStack } from '../lib/sfn/interactions-dataset-sfn-stack';
import { RankingSfnStack } from '../lib/sfn/ranking-sfn-stack';
import { BatchInferenceSfnStack } from '../lib/sfn/batch-inference-sfn-stack';
import { TrainRecipeSfnStack } from '../lib/sfn/train-recipe-sfn-stack';
import { CleanupSfnStack } from '../lib/sfn/cleanup-sfn-stack';
import { SfnIntegrationStack } from '../lib/integrations/sfn-integration-stack';
import { ApiIntegrationStack } from '../lib/integrations/api-integration-stack';
import { ns, StackProps, AppContext, VpcProps } from '../lib/interfaces/constant';

const app = new cdk.App({
  context: AppContext
});

// Common
const vpcStack = new VpcStack(app, `${ns}VpcStack`, {
  ...StackProps,
  ...VpcProps,
});
const apiGwStack = new ApiGatewayStack(app, `${ns}ApiGatewayStack`, {
  ...StackProps,
  apigwVpcEndpoint: vpcStack.apigwVpcEndpoint,
});
apiGwStack.addDependency(vpcStack)

const commonLambdaStack = new CommonLambdaStack(app, `${ns}CommonLambdaStack`, StackProps);
const apiLambdaStack = new ApiLambdaStack(app, `${ns}ApiLambdaStack`, StackProps);

const commonSfnStack = new CommonSfnStack(app, `${ns}CommonSfnStack`, StackProps);

// Define Lambdas for Sfn
const simsLambdaStack = new SimsLambdaStack(app, `${ns}SimsLambdaStack`, {
  ...StackProps,
  lambdaExecutionRole: commonLambdaStack.lambdaExecutionRole,
});
simsLambdaStack.addDependency(commonLambdaStack);

const userPersonalizationLambdaStack = new UserPersonalizationLambdaStack(app, `${ns}UserPersonalizationLambdaStack`, {
  ...StackProps,
  lambdaExecutionRole: commonLambdaStack.lambdaExecutionRole,
});
userPersonalizationLambdaStack.addDependency(commonLambdaStack);

const metadataDatasetLambdaStack = new MetadataDatasetLambdaStack(app, `${ns}MetadataDatasetLambdaStack`, {
  ...StackProps,
  lambdaExecutionRole: commonLambdaStack.lambdaExecutionRole,
});
metadataDatasetLambdaStack.addDependency(commonLambdaStack);

const interactionsDatasetLambdaStack = new InteractionsDatasetLambdaStack(app, `${ns}InteractionsDatasetLambdaStack`, {
  ...StackProps,
  lambdaExecutionRole: commonLambdaStack.lambdaExecutionRole,
});
interactionsDatasetLambdaStack.addDependency(commonLambdaStack);

const rankingLambdaStack = new RankingLambdaStack(app, `${ns}RankingLambdaStack`, {
  ...StackProps,
  lambdaExecutionRole: commonLambdaStack.lambdaExecutionRole,
});
rankingLambdaStack.addDependency(commonLambdaStack);

const batchInferenceLambdaStack = new BatchInferenceLambdaStack(app, `${ns}BatchInferenceLambdaStack`, {
  ...StackProps,
  lambdaExecutionRole: commonLambdaStack.lambdaExecutionRole,
});
batchInferenceLambdaStack.addDependency(commonLambdaStack);

const trainRecipeLambdaStack = new TrainRecipeLambdaStack(app, `${ns}TrainRecipeLambdaStack`, {
  ...StackProps,
  lambdaExecutionRole: commonLambdaStack.lambdaExecutionRole,
});
trainRecipeLambdaStack.addDependency(commonLambdaStack);

// Define Sfns
const simsSfnStack = new SimsSfnStack(app, `${ns}SimsSfnStack`, {
  ...StackProps,
  doneTopic: commonLambdaStack.doneTopic,
  failTopic: commonLambdaStack.failTopic,
  sfnExecutionRole: commonSfnStack.sfnExecutionRole,
  datasetGroupFunction: simsLambdaStack.datasetGroupFunction,
  datasetFunction: simsLambdaStack.datasetFunction,
  solutionFunction: simsLambdaStack.solutionFunction,
  campaignFunction: simsLambdaStack.campaignFunction,
  checkReadyFunction: simsLambdaStack.checkReadyFunction,
});
simsSfnStack.addDependency(commonSfnStack);
simsSfnStack.addDependency(simsLambdaStack);

const userPersonalizationSfnStack = new UserPersonalizationSfnStack(app, `${ns}UserPersonalizationSfnStack`, {
  ...StackProps,
  doneTopic: commonLambdaStack.doneTopic,
  failTopic: commonLambdaStack.failTopic,
  sfnExecutionRole: commonSfnStack.sfnExecutionRole,
  datasetGroupFunction: userPersonalizationLambdaStack.datasetGroupFunction,
  datasetFunction: userPersonalizationLambdaStack.datasetFunction,
  itemDatasetFunction: userPersonalizationLambdaStack.itemDatasetFunction,
  userDatasetFunction: userPersonalizationLambdaStack.userDatasetFunction,
  solutionFunction: userPersonalizationLambdaStack.solutionFunction,
  campaignFunction: userPersonalizationLambdaStack.campaignFunction,
  checkReadyFunction: userPersonalizationLambdaStack.checkReadyFunction,
});
userPersonalizationSfnStack.addDependency(commonSfnStack);
userPersonalizationSfnStack.addDependency(userPersonalizationLambdaStack);

const metadataDatasetSfnStack = new MetadataDatasetSfnStack(app, `${ns}MetadataDatasetSfnStack`, {
  ...StackProps,
  doneTopic: commonLambdaStack.doneTopic,
  failTopic: commonLambdaStack.failTopic,
  sfnExecutionRole: commonSfnStack.sfnExecutionRole,
  itemDatasetFunction: metadataDatasetLambdaStack.itemDatasetFunction,
  userDatasetFunction: metadataDatasetLambdaStack.userDatasetFunction,
  solutionFunction: metadataDatasetLambdaStack.solutionFunction,
  campaignFunction: metadataDatasetLambdaStack.campaignFunction,
  checkReadyFunction: metadataDatasetLambdaStack.checkReadyFunction,
});
metadataDatasetSfnStack.addDependency(commonSfnStack);
metadataDatasetSfnStack.addDependency(metadataDatasetLambdaStack);

const interactionsDatasetSfnStack = new InteractionsDatasetSfnStack(app, `${ns}InteractionsDatasetSfnStack`, {
  ...StackProps,
  doneTopic: commonLambdaStack.doneTopic,
  failTopic: commonLambdaStack.failTopic,
  sfnExecutionRole: commonSfnStack.sfnExecutionRole,
  datasetFunction: interactionsDatasetLambdaStack.datasetFunction,
  solutionFunction: interactionsDatasetLambdaStack.solutionFunction,
  campaignFunction: interactionsDatasetLambdaStack.campaignFunction,
  checkReadyFunction: interactionsDatasetLambdaStack.checkReadyFunction,
});
interactionsDatasetSfnStack.addDependency(commonSfnStack);
interactionsDatasetSfnStack.addDependency(interactionsDatasetLambdaStack);

const rankingSfnStack = new RankingSfnStack(app, `${ns}RankingSfnStack`, {
  ...StackProps,
  doneTopic: commonLambdaStack.doneTopic,
  failTopic: commonLambdaStack.failTopic,
  sfnExecutionRole: commonSfnStack.sfnExecutionRole,
  datasetGroupFunction: rankingLambdaStack.datasetGroupFunction,
  datasetFunction: rankingLambdaStack.datasetFunction,
  solutionFunction: rankingLambdaStack.solutionFunction,
  campaignFunction: rankingLambdaStack.campaignFunction,
  checkReadyFunction: rankingLambdaStack.checkReadyFunction,
});
rankingSfnStack.addDependency(commonSfnStack);
rankingSfnStack.addDependency(rankingLambdaStack);

const batchInferenceSfnStack = new BatchInferenceSfnStack(app, `${ns}BatchInferenceSfnStack`, {
  ...StackProps,
  doneTopic: commonLambdaStack.doneTopic,
  failTopic: commonLambdaStack.failTopic,
  sfnExecutionRole: commonSfnStack.sfnExecutionRole,
  batchInferenceFunction: batchInferenceLambdaStack.batchInferenceFunction,
  checkBatchReadyFunction: batchInferenceLambdaStack.checkBatchReadyFunction,
});
batchInferenceSfnStack.addDependency(commonSfnStack);
batchInferenceSfnStack.addDependency(batchInferenceLambdaStack);

const trainRecipeSfnStack = new TrainRecipeSfnStack(app, `${ns}TrainRecipeSfnStack`, {
  ...StackProps,
  doneTopic: commonLambdaStack.doneTopic,
  failTopic: commonLambdaStack.failTopic,
  sfnExecutionRole: commonSfnStack.sfnExecutionRole,
  solutionFunction: trainRecipeLambdaStack.solutionFunction,
  campaignFunction: trainRecipeLambdaStack.campaignFunction,
  checkReadyFunction: trainRecipeLambdaStack.checkReadyFunction,
});
trainRecipeSfnStack.addDependency(commonSfnStack);
trainRecipeSfnStack.addDependency(trainRecipeLambdaStack);

const cleanupLambdaStack = new CleanupLambdaStack(app, `${ns}CleanupLambdaStack`, {
  ...StackProps,
  lambdaExecutionRole: commonLambdaStack.lambdaExecutionRole,
});
cleanupLambdaStack.addDependency(commonLambdaStack);

const cleanupSfnStack = new CleanupSfnStack(app, `${ns}CleanupSfnStack`, {
  ...StackProps,
  doneTopic: commonLambdaStack.doneTopic,
  failTopic: commonLambdaStack.failTopic,
  sfnExecutionRole: commonSfnStack.sfnExecutionRole,
  fetchArnFunction: cleanupLambdaStack.fetchArnFunction,
  deleteResourceFunction: cleanupLambdaStack.deleteResourceFunction,
  checkDeleteFunction: cleanupLambdaStack.checkDeleteFunction,
});
cleanupSfnStack.addDependency(commonSfnStack);
cleanupSfnStack.addDependency(cleanupLambdaStack);

// ApiGateway AWSIntegration
const sfnIntegrationStack = new SfnIntegrationStack(app, `${ns}SfnIntegrationStack`, {
  ...StackProps,
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  simsStateMachine: simsSfnStack.stateMachine,
  userPersonalizationStateMachine: userPersonalizationSfnStack.stateMachine,
  metadataDatasetStateMachine: metadataDatasetSfnStack.stateMachine,
  interactionsDatasetStateMachine: interactionsDatasetSfnStack.stateMachine,
  rankingStateMachine: rankingSfnStack.stateMachine,
  batchInferenceStateMachine: batchInferenceSfnStack.stateMachine,
  trainRecipeStateMachine: trainRecipeSfnStack.stateMachine,
  cleanupStateMachine: cleanupSfnStack.stateMachine,
});
sfnIntegrationStack.addDependency(apiGwStack);
sfnIntegrationStack.addDependency(simsSfnStack);
sfnIntegrationStack.addDependency(userPersonalizationSfnStack);
sfnIntegrationStack.addDependency(metadataDatasetSfnStack);
sfnIntegrationStack.addDependency(interactionsDatasetSfnStack);
sfnIntegrationStack.addDependency(rankingSfnStack);
sfnIntegrationStack.addDependency(batchInferenceSfnStack);
sfnIntegrationStack.addDependency(trainRecipeSfnStack);
sfnIntegrationStack.addDependency(cleanupSfnStack);

// ApiGateway LambdaIntegration
const apiIntegrationStack = new ApiIntegrationStack(app, `${ns}ApiIntegrationStack`, {
  ...StackProps,
  api: apiGwStack.api,
  requestModels: apiGwStack.apiRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  getTrackingIdFunction: apiLambdaStack.getTrackingIdFunction,
  getMetricsFunction: apiLambdaStack.getMetricsFunction,
  recommendSimsFunction: apiLambdaStack.recommendSimsFunction,
  recommendHrnnFunction: apiLambdaStack.recommendHrnnFunction,
  recommendRankingFunction: apiLambdaStack.recommendRankingFunction,
  listCampaignArnsFunction: apiLambdaStack.listCampaignArnsFunction,
  createSchemaFunction: apiLambdaStack.createSchemaFunction,
  listSchemaArnsFunction: apiLambdaStack.listSchemaArnsFunction,
  listSolutionVersionArnsFunction: apiLambdaStack.listSolutionVersionArnsFunction,
  putEventsFunction: apiLambdaStack.putEventsFunction,
});
apiIntegrationStack.addDependency(apiGwStack);
apiIntegrationStack.addDependency(apiLambdaStack);