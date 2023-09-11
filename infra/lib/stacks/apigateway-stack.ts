import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import {
  ApiRequestModels,
  StatesRequestModels,
  RequestValidators,
} from '../interfaces/interface';

interface Props extends cdk.StackProps {
  apigwVpcEndpoint?: ec2.IVpcEndpoint;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly api: apigw.RestApi;
  public readonly credentialsRole: iam.IRole;
  public readonly apiRequestModels: ApiRequestModels;
  public readonly statesRequestModels: StatesRequestModels;
  public readonly requestValidators: RequestValidators;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const stageName = 'dev';
    const { policy, endpointConfiguration } = this.getApiOptions(
      props.apigwVpcEndpoint
    );
    this.api = new apigw.RestApi(this, `RestApi`, {
      restApiName: `${cdk.Stack.of(this).stackName}RestApi`,
      deploy: true,
      deployOptions: {
        stageName,
        loggingLevel: apigw.MethodLoggingLevel.ERROR,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
      },
      endpointConfiguration,
      policy,
    });
    this.api.root.addMethod('ANY');
    this.api.root.addResource('personalize');

    const credentialsRole = new iam.Role(this, 'ApigwCredentialRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        {
          managedPolicyArn:
            'arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs',
        },
      ],
    });
    credentialsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction', 'states:StartExecution'],
        resources: ['*'],
      })
    );
    this.credentialsRole = credentialsRole;

    this.apiRequestModels = {
      CreateSchemaModel: this.registerCreateSchemaModel(),
      CreateFilterModel: this.registerCreateFilterModel(),
      PutEventsModel: this.registerPutEventsModel(),
    };

    const simsHrnnModel = this.registerSimsHrnnModel();
    this.statesRequestModels = {
      SimilarItemsModel: simsHrnnModel,
      RankingModel: simsHrnnModel,
      UserPersonalizationModel: this.registerUserPersonalizationModel(),
      MetadataDatasetModel: this.registerMetadataDatasetModel(),
      InteractionsDatasetModel: this.registerInteractionsDatasetModel(),
      BatchInferenceModel: this.registerBatchInferenceModel(),
      TrainRecipeModel: this.registerTrainRecipeModel(),
      CleanupModel: this.registerCleanupModel(),
    };

    this.requestValidators = {
      parameterValidator: this.api.addRequestValidator(`ParameterValidator`, {
        requestValidatorName: 'ParameterValidator',
        validateRequestParameters: true,
      }),
      bodyValidator: this.api.addRequestValidator(`BodyValidator`, {
        requestValidatorName: 'BodyValidator',
        validateRequestBody: true,
      }),
    };
  }

  private getApiOptions(apigwVpcEndpoint?: ec2.IVpcEndpoint) {
    if (apigwVpcEndpoint) {
      const policyDocument = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: 'execute-api:Invoke',
            Resource: ['execute-api:/*'],
          },
          {
            Effect: 'Deny',
            Principal: '*',
            Action: 'execute-api:Invoke',
            Resource: ['execute-api:/*'],
            Condition: {
              StringNotEquals: {
                'aws:SourceVpce': apigwVpcEndpoint.vpcEndpointId,
              },
            },
          },
        ],
      };
      const endpointConfiguration = {
        types: [apigw.EndpointType.PRIVATE],
        vpcEndpoints: [apigwVpcEndpoint],
      };
      return {
        policy: iam.PolicyDocument.fromJson(policyDocument),
        endpointConfiguration,
      };
    } else {
      return {
        policy: undefined,
        endpointConfiguration: {
          types: [apigw.EndpointType.REGIONAL],
        },
      };
    }
  }

  // Apis Models
  private registerCreateSchemaModel() {
    return this.api.addModel(`ApiCreateSchemaModel`, {
      contentType: 'application/json',
      modelName: 'ApiCreateSchema',
      schema: {
        description: 'create schema',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING,
          },
          schema: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              type: {
                type: apigw.JsonSchemaType.STRING,
              },
              name: {
                type: apigw.JsonSchemaType.STRING,
              },
              namespace: {
                type: apigw.JsonSchemaType.STRING,
              },
              fields: {
                items: {
                  type: apigw.JsonSchemaType.OBJECT,
                },
                type: apigw.JsonSchemaType.ARRAY,
              },
              version: {
                type: apigw.JsonSchemaType.STRING,
              },
            },
          },
        },
        required: ['name', 'schema'],
      },
    });
  }

  private registerCreateFilterModel() {
    return this.api.addModel(`ApiCreateFilterModel`, {
      contentType: 'application/json',
      modelName: 'ApiCreateFilter',
      schema: {
        description: 'create filter',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            description: 'name of filter',
            type: apigw.JsonSchemaType.STRING,
          },
          dataset_group_name: {
            type: apigw.JsonSchemaType.STRING,
          },
          filter_expression: {
            description: 'sql like filter expression',
            type: apigw.JsonSchemaType.STRING,
          },
        },
        required: ['name', 'dataset_group_name', 'filter_expression'],
      },
    });
  }

  // States Models
  private registerSimsHrnnModel() {
    return this.api.addModel(`StatesSimsHrnnModel`, {
      contentType: 'application/json',
      modelName: 'StatesSimsHrnnModel',
      schema: {
        description:
          'start similar-items / user-personalization / ranking pipeline',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING,
          },
          schema_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          bucket: {
            type: apigw.JsonSchemaType.STRING,
          },
          perform_hpo: {
            description: 'set true to perform HPO',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING,
          },
          deploy: {
            description: 'set true to create campaign',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING,
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
            },
          },
          campaign_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              itemExplorationConfig: {
                type: apigw.JsonSchemaType.OBJECT,
                properties: {
                  explorationWeight: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                  explorationItemAgeCutOff: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                },
              },
            },
          },
        },
        required: ['name', 'schema_arn', 'bucket'],
      },
    });
  }

  private registerUserPersonalizationModel() {
    return this.api.addModel(`StatesUserPersonalizationModel`, {
      contentType: 'application/json',
      modelName: 'StatesUserPersonalizationModel',
      schema: {
        description: 'start user-personalization pipeline',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING,
          },
          schema_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          bucket: {
            type: apigw.JsonSchemaType.STRING,
          },
          item_schema_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          item_bucket: {
            type: apigw.JsonSchemaType.STRING,
          },
          user_schema_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          user_bucket: {
            type: apigw.JsonSchemaType.STRING,
          },
          perform_hpo: {
            description: 'set true to perform HPO',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING,
          },
          deploy: {
            description: 'set true to create campaign',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING,
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
            },
          },
          campaign_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              itemExplorationConfig: {
                type: apigw.JsonSchemaType.OBJECT,
                properties: {
                  explorationWeight: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                  explorationItemAgeCutOff: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                },
              },
            },
          },
        },
        required: ['name', 'schema_arn', 'bucket'],
      },
    });
  }

  private registerMetadataDatasetModel() {
    return this.api.addModel(`StatesMetadataDatasetModel`, {
      contentType: 'application/json',
      modelName: 'StatesMetadataDatasetModel',
      schema: {
        description: 'import new metadata and create campaign',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING,
          },
          item_schema_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          item_bucket: {
            type: apigw.JsonSchemaType.STRING,
          },
          user_schema_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          user_bucket: {
            type: apigw.JsonSchemaType.STRING,
          },
          perform_hpo: {
            description: 'set true to perform HPO',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING,
          },
          deploy: {
            description: 'set true to create campaign',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          solution_arn: {
            description: 'training_mode required solution_arn',
            type: apigw.JsonSchemaType.STRING,
          },
          training_mode: {
            description: 'training_mode required solution_arn',
            type: apigw.JsonSchemaType.STRING,
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING,
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
            },
          },
          campaign_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              itemExplorationConfig: {
                type: apigw.JsonSchemaType.OBJECT,
                properties: {
                  explorationWeight: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                  explorationItemAgeCutOff: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                },
              },
            },
          },
        },
        required: ['name'],
      },
    });
  }

  private registerInteractionsDatasetModel() {
    return this.api.addModel(`StatesInteractionsDatasetModel`, {
      contentType: 'application/json',
      modelName: 'StatesInteractionsDatasetModel',
      schema: {
        description: 'import new interaction dataset and create campaign',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING,
          },
          schema_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          bucket: {
            type: apigw.JsonSchemaType.STRING,
          },
          recipe_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          perform_hpo: {
            description: 'set true to perform HPO',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING,
          },
          deploy: {
            description: 'set true to create campaign',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          solution_arn: {
            description: 'training_mode requires solution_arn',
            type: apigw.JsonSchemaType.STRING,
          },
          training_mode: {
            description: 'training_mode requires solution_arn',
            type: apigw.JsonSchemaType.STRING,
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING,
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
            },
          },
          campaign_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              itemExplorationConfig: {
                type: apigw.JsonSchemaType.OBJECT,
                properties: {
                  explorationWeight: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                  explorationItemAgeCutOff: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                },
              },
            },
          },
        },
        required: ['name', 'schema_arn', 'bucket', 'recipe_arn'],
      },
    });
  }

  private registerBatchInferenceModel() {
    return this.api.addModel(`StatesBatchInferenceModel`, {
      contentType: 'application/json',
      modelName: 'StatesBatchInferenceModel',
      schema: {
        description: 'start batch inference pipeline',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            description: 'name for batch inference job',
            type: apigw.JsonSchemaType.STRING,
          },
          solution_version_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          input_path: {
            type: apigw.JsonSchemaType.STRING,
          },
          output_path: {
            type: apigw.JsonSchemaType.STRING,
          },
          num_results: {
            type: apigw.JsonSchemaType.INTEGER,
          },
          batch_inference_job_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              itemExplorationConfig: {
                type: apigw.JsonSchemaType.OBJECT,
                properties: {
                  explorationWeight: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                  explorationItemAgeCutOff: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                },
              },
            },
          },
        },
        required: ['name', 'solution_version_arn', 'input_path', 'output_path'],
      },
    });
  }

  private registerTrainRecipeModel() {
    return this.api.addModel(`StatesTrainRecipe`, {
      contentType: 'application/json',
      modelName: 'StatesTrainRecipe',
      schema: {
        description: 'create campaign with given recipe for existing dataset',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING,
          },
          recipe_arn: {
            type: apigw.JsonSchemaType.STRING,
          },
          perform_hpo: {
            description: 'set true to perform HPO',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING,
          },
          deploy: {
            description: 'set true to create campaign',
            type: apigw.JsonSchemaType.BOOLEAN,
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING,
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
            },
          },
          campaign_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              itemExplorationConfig: {
                type: apigw.JsonSchemaType.OBJECT,
                properties: {
                  explorationWeight: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                  explorationItemAgeCutOff: {
                    type: apigw.JsonSchemaType.STRING,
                  },
                },
              },
            },
          },
        },
        required: ['name', 'recipe_arn'],
      },
    });
  }

  private registerCleanupModel() {
    return this.api.addModel(`StatesCleanupModel`, {
      contentType: 'application/json',
      modelName: 'StatesCleanupModel',
      schema: {
        description: 'clean up dataset-group and its related resources',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            description: 'name of dataset-group',
            type: apigw.JsonSchemaType.STRING,
          },
        },
        required: ['name'],
      },
    });
  }

  // Event Models
  private registerPutEventsModel() {
    return this.api.addModel(`PutEventsModel`, {
      contentType: 'application/json',
      modelName: 'PutEventsModel',
      schema: {
        description: 'put event to personalize asynchronously',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          tracking_id: {
            type: apigw.JsonSchemaType.STRING,
          },
          session_id: {
            type: apigw.JsonSchemaType.STRING,
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING,
          },
          event_value: {
            type: apigw.JsonSchemaType.NUMBER,
          },
          user_id: {
            type: apigw.JsonSchemaType.STRING,
          },
          item_id: {
            type: apigw.JsonSchemaType.STRING,
          },
          sent_at: {
            description: 'unix timestamp',
            type: apigw.JsonSchemaType.INTEGER,
          },
          properties: {
            description:
              'A string map of event-specific data that you might choose to record',
            type: apigw.JsonSchemaType.OBJECT,
          },
          recommendation_id: {
            type: apigw.JsonSchemaType.STRING,
          },
          impression: {
            description: 'list of item IDs',
            items: {
              type: apigw.JsonSchemaType.STRING,
            },
            type: apigw.JsonSchemaType.ARRAY,
          },
        },
        required: [
          'tracking_id',
          'session_id',
          'event_type',
          'user_id',
          'item_id',
          'sent_at',
        ],
      },
    });
  }
}
