import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { SimsStates } from '../constructs/sims-states';
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

export class SimsStack extends Sfn.BaseStack {
  public readonly stateMachine: sfn.IStateMachine;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const states = new SimsStates(this, 'SimsStates', props);
    this.stateMachine = states.stateMachine;

    const resource = props.api.root.resourceForPath('personalize');
    this.registerSfnIntegration({
      resource: resource.addResource('sims'),
      methodOptions: {
        ...this.methodOptions,
        requestModels: {
          'application/json': props.requestModels.SimsModel,
        },
        requestValidator: props.requestValidators.bodyValidator,
      },
      credentialsRole: props.credentialsRole,
      stateMachineArn: this.stateMachine.stateMachineArn,
    });
  }
}
