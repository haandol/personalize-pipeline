import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { TrainRecipeStates } from '../constructs/train-recipe-states';
import { TrainUsecaseStates } from '../constructs/train-usecase-states';
import {
  StatesRequestModels,
  RequestValidators,
} from '../interfaces/interface';
import { Sfn } from '../interfaces/base-stack';

interface Props extends cdk.StackProps {
  api: apigw.IRestApi;
  requestModels: StatesRequestModels;
  requestValidators: RequestValidators;
  credentialsRole: iam.IRole;
  doneTopic: sns.ITopic;
  failTopic: sns.ITopic;
}

export class TrainRecipeUsecaseStack extends Sfn.BaseStack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const recipeStates = new TrainRecipeStates(
      this,
      'TrainRecipeStates',
      props
    );
    const usecaseStates = new TrainUsecaseStates(
      this,
      'TrainUsecaseStates',
      props
    );

    const api = apigw.RestApi.fromRestApiAttributes(this, 'RestApi', {
      restApiId: props.api.restApiId,
      rootResourceId: props.api.root.resourceId,
    });

    const trainResource = api.root.resourceForPath('/train');
    this.registerSfnIntegration({
      resource: trainResource.addResource('recipe'),
      methodOptions: {
        ...this.methodOptions,
        requestModels: {
          'application/json': props.requestModels.TrainRecipeModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: recipeStates.stateMachine.stateMachineArn,
    });

    this.registerSfnIntegration({
      resource: trainResource.addResource('usecase'),
      methodOptions: {
        ...this.methodOptions,
        requestModels: {
          'application/json': props.requestModels.TrainUsecaseModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: usecaseStates.stateMachine.stateMachineArn,
    });
  }
}
