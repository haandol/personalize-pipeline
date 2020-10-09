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

import * as apigw from '@aws-cdk/aws-apigateway';

export interface ApiRequestModels {
  CreateSchemaModel: apigw.IModel;
  CreateFilterModel: apigw.IModel;
  PutEventsModel: apigw.IModel;
}

export interface StatesRequestModels {
  SimsModel: apigw.IModel;
  MetadataDatasetModel: apigw.IModel;
  UserPersonalizationModel: apigw.IModel;
  InteractionsDatasetModel: apigw.IModel;
  RankingModel: apigw.IModel;
  BatchInferenceModel: apigw.IModel;
  TrainRecipeModel: apigw.IModel;
  CleanupModel: apigw.IModel;
}

export interface RequestValidators {
  parameterValidator: apigw.IRequestValidator;
  bodyValidator: apigw.IRequestValidator;
}