import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { CleanupStates } from '../constructs/cleanup-states';
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

export class CleanupStack extends Sfn.BaseStack {
  public readonly stateMachine: sfn.IStateMachine;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const states = new CleanupStates(this, 'CleanupStates', props);
    this.stateMachine = states.stateMachine;

    const api = apigw.RestApi.fromRestApiAttributes(this, 'RestApi', {
      restApiId: props.api.restApiId,
      rootResourceId: props.api.root.resourceId,
    });

    this.registerSfnIntegration({
      resource: api.root.addResource('cleanup'),
      methodOptions: {
        ...this.methodOptions,
        requestModels: {
          'application/json': props.requestModels.CleanupModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: this.stateMachine.stateMachineArn,
    });
  }
}
