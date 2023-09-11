import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { SimilarItemsStates } from '../constructs/similar-items-states';
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

export class SimilarItemsStack extends Sfn.BaseStack {
  public readonly stateMachine: sfn.IStateMachine;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const states = new SimilarItemsStates(this, 'SimilarItemsStates', props);
    this.stateMachine = states.stateMachine;

    const api = apigw.RestApi.fromRestApiAttributes(this, 'RestApi', {
      restApiId: props.api.restApiId,
      rootResourceId: props.api.root.resourceId,
    });

    this.registerSfnIntegration({
      resource: api.root.addResource('similar-items'),
      methodOptions: {
        ...this.methodOptions,
        requestModels: {
          'application/json': props.requestModels.SimilarItemsModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: this.stateMachine.stateMachineArn,
    });
  }
}
