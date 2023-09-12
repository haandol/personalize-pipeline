#!/usr/bin/env node

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpc-stack';
import { ApiGatewayStack } from '../lib/stacks/apigateway-stack';
import { CommonStack } from '../lib/stacks/common-stack';
import { SimilarItemsStack } from '../lib/stacks/similar-items';
import { UserPersonalizationStack } from '../lib/stacks/user-personalization-stack';
import { MetadataDatasetStack } from '../lib/stacks/metadata-dataset-stack';
import { InteractionDatasetStack } from '../lib/stacks/interaction-dataset-stack';
import { RankingStack } from '../lib/stacks/ranking-stack';
import { BatchInferenceStack } from '../lib/stacks/batch-inference-stack';
import { BatchSegmentStack } from '../lib/stacks/batch-segment-stack';
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

const commonStack = new CommonStack(app, `${Config.app.ns}CommonStack`, {
  notification: {
    emailSender: Config.notification?.emailSender,
    emailReceiver: Config.notification?.emailReceiver,
    slackWebhook: Config.notification?.slackWebhook,
    chimeWebhook: Config.notification?.chimeWebhook,
  },
});

const simItemStack = new SimilarItemsStack(
  app,
  `${Config.app.ns}SimilarItemsStack`,
  {
    api: apiGwStack.api,
    requestModels: apiGwStack.statesRequestModels,
    requestValidators: apiGwStack.requestValidators,
    credentialsRole: apiGwStack.credentialsRole,
    doneTopic: commonStack.doneTopic,
    failTopic: commonStack.failTopic,
  }
);
simItemStack.addDependency(apiGwStack);
simItemStack.addDependency(commonStack);

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
userPersonalizationStack.addDependency(apiGwStack);
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
metadataDatasetStack.addDependency(apiGwStack);
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
interactionDatasetStack.addDependency(apiGwStack);
interactionDatasetStack.addDependency(commonStack);

const rankingStack = new RankingStack(app, `${Config.app.ns}RankingStack`, {
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
});
rankingStack.addDependency(apiGwStack);
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
batchInferenceStack.addDependency(apiGwStack);
batchInferenceStack.addDependency(commonStack);

const batchSegmentStack = new BatchSegmentStack(
  app,
  `${Config.app.ns}BatchSegmentStack`,
  {
    api: apiGwStack.api,
    requestModels: apiGwStack.statesRequestModels,
    requestValidators: apiGwStack.requestValidators,
    credentialsRole: apiGwStack.credentialsRole,
    doneTopic: commonStack.doneTopic,
    failTopic: commonStack.failTopic,
  }
);
batchSegmentStack.addDependency(apiGwStack);
batchSegmentStack.addDependency(commonStack);

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
trainRecipeStack.addDependency(apiGwStack);
trainRecipeStack.addDependency(commonStack);

const cleanupStack = new CleanupStack(app, `${Config.app.ns}CleanupStack`, {
  api: apiGwStack.api,
  requestModels: apiGwStack.statesRequestModels,
  requestValidators: apiGwStack.requestValidators,
  credentialsRole: apiGwStack.credentialsRole,
  doneTopic: commonStack.doneTopic,
  failTopic: commonStack.failTopic,
});
cleanupStack.addDependency(apiGwStack);
cleanupStack.addDependency(commonStack);

// ApiGateway LambdaIntegration
const apiIntegrationStack = new ApiIntegrationStack(
  app,
  `${Config.app.ns}ApiIntegrationStack`,
  {
    api: apiGwStack.api,
    requestModels: apiGwStack.apiRequestModels,
    requestValidators: apiGwStack.requestValidators,
    credentialsRole: apiGwStack.credentialsRole,
  }
);
apiIntegrationStack.addDependency(apiGwStack);
