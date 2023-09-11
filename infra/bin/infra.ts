#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpc-stack';
import { ApiGatewayStack } from '../lib/stacks/apigateway-stack';
import { CommonStack } from '../lib/stacks/common-stack';
import { SimsStack } from '../lib/stacks/sims-stack';
import { UserPersonalizationStack } from '../lib/stacks/user-personalization-stack';
import { MetadataDatasetStack } from '../lib/stacks/metadata-dataset-stack';
import { InteractionDatasetStack } from '../lib/stacks/interaction-dataset-stack';
import { RankingStack } from '../lib/stacks/ranking-stack';
import { BatchInferenceStack } from '../lib/stacks/batch-inference-stack';
import { TrainRecipeStack } from '../lib/stacks/train-recipe-stack';
import { CleanupStack } from '../lib/stacks/cleanup-stack';
import { ApiIntegrationStack } from '../lib/stacks/api-integration-stack';
import { StorageStack } from '../lib/stacks/storage-stack';
import { Config } from '../config/loader';

const app = new cdk.App({
  context: {
    ns: Config.app.ns,
    stage: Config.app.stage,
  },
});

// Common
new StorageStack(app, `${Config.app.ns}StorageStack`);

const vpcStack = new VpcStack(app, `${Config.app.ns}VpcStack`);
const apiGwStack = new ApiGatewayStack(app, `${Config.app.ns}ApiGatewayStack`, {
  apigwVpcEndpoint: vpcStack.apigwVpcEndpoint,
});
apiGwStack.addDependency(vpcStack);

const commonStack = new CommonStack(app, `${Config.app.ns}CommonStack`);

const simsStack = new SimsStack(app, `${Config.app.ns}SimsStack`, {
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
});
simsStack.addDependency(commonStack);

const userPersonalizationStack = new UserPersonalizationStack(
  app,
  `${Config.app.ns}UserPersonalizationStack`,
  {
    api: apiGwStack.api,
    requestModels: apiGwStack.statesRequestModels,
    requestValidators: apiGwStack.requestValidators,
    credentialsRole: apiGwStack.credentialsRole,
    doneTopic: commonStack.doneTopic,
    failTopic: commonStack.failTopic,
  }
);
userPersonalizationStack.addDependency(commonStack);

const metadataDatasetStack = new MetadataDatasetStack(
  app,
  `${Config.app.ns}MetadataDatasetStack`,
  {
    api: apiGwStack.api,
    requestModels: apiGwStack.statesRequestModels,
    requestValidators: apiGwStack.requestValidators,
    credentialsRole: apiGwStack.credentialsRole,
    doneTopic: commonStack.doneTopic,
    failTopic: commonStack.failTopic,
  }
);
metadataDatasetStack.addDependency(commonStack);

const interactionDatasetStack = new InteractionDatasetStack(
  app,
  `${Config.app.ns}InteractionDatasetStack`,
  {
    api: apiGwStack.api,
    requestModels: apiGwStack.statesRequestModels,
    requestValidators: apiGwStack.requestValidators,
    credentialsRole: apiGwStack.credentialsRole,
    doneTopic: commonStack.doneTopic,
    failTopic: commonStack.failTopic,
  }
);
interactionDatasetStack.addDependency(commonStack);

const rankingStack = new RankingStack(app, `${Config.app.ns}RankingStack`, {
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
});
rankingStack.addDependency(commonStack);

const batchInferenceStack = new BatchInferenceStack(
  app,
  `${Config.app.ns}BatchInferenceStack`,
  {
    api: apiGwStack.api,
    requestModels: apiGwStack.statesRequestModels,
    requestValidators: apiGwStack.requestValidators,
    credentialsRole: apiGwStack.credentialsRole,
    doneTopic: commonStack.doneTopic,
    failTopic: commonStack.failTopic,
  }
);
batchInferenceStack.addDependency(commonStack);

const trainRecipeStack = new TrainRecipeStack(
  app,
  `${Config.app.ns}TrainRecipeStack`,
  {
    api: apiGwStack.api,
    requestModels: apiGwStack.statesRequestModels,
    requestValidators: apiGwStack.requestValidators,
    credentialsRole: apiGwStack.credentialsRole,
    doneTopic: commonStack.doneTopic,
    failTopic: commonStack.failTopic,
  }
);
trainRecipeStack.addDependency(commonStack);

const cleanupStack = new CleanupStack(app, `${Config.app.ns}CleanupStack`, {
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
});
cleanupStack.addDependency(commonStack);

// ApiGateway LambdaIntegration
new ApiIntegrationStack(app, `${Config.app.ns}ApiIntegrationStack`, {
  api: apiGwStack.api,
  requestModels: apiGwStack.apiRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
});
