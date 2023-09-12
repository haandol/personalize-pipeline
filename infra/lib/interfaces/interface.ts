import * as apigw from 'aws-cdk-lib/aws-apigateway';

export interface ApiRequestModels {
  CreateSchemaModel: apigw.IModel;
  CreateFilterModel: apigw.IModel;
  PutEventsModel: apigw.IModel;
}

export interface StatesRequestModels {
  SimilarItemsModel: apigw.IModel;
  MetadataDatasetModel: apigw.IModel;
  UserPersonalizationModel: apigw.IModel;
  InteractionsDatasetModel: apigw.IModel;
  RankingModel: apigw.IModel;
  BatchInferenceModel: apigw.IModel;
  BatchSegmentModel: apigw.IModel;
  TrainRecipeModel: apigw.IModel;
  CleanupModel: apigw.IModel;
}

export interface RequestValidators {
  parameterValidator: apigw.IRequestValidator;
  bodyValidator: apigw.IRequestValidator;
}
