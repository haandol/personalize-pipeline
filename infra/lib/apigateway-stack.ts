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

import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as apigw from '@aws-cdk/aws-apigateway';
import {
  ApiRequestModels, StatesRequestModels, EventRequestModels, RequestValidators
} from './interfaces/interface';

interface Props extends cdk.StackProps {
  apigwVpcEndpoint: ec2.IVpcEndpoint;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly api: apigw.RestApi;
  public readonly credentialsRole: iam.IRole;
  public readonly apiRequestModels: ApiRequestModels;
  public readonly statesRequestModels: StatesRequestModels;
  public readonly eventRequestModels: EventRequestModels;
  public readonly requestValidators: RequestValidators;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);

    const ns = scope.node.tryGetContext('ns') || '';

    const policyDocument = {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": "*",
          "Action": "execute-api:Invoke",
          "Resource": "execute-api:/*/*/*"
        }
      ]
    };
    const stageName = 'dev'
    this.api = new apigw.RestApi(this, `RestApi`, {
      restApiName: `${ns}RestApi`,
      deploy: true,
      deployOptions: {
        stageName,
        loggingLevel: apigw.MethodLoggingLevel.ERROR,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
      },
      endpointConfiguration: {
        types: [apigw.EndpointType.PRIVATE],
        vpcEndpoints: [props.apigwVpcEndpoint]
      },
      policy: iam.PolicyDocument.fromJson(policyDocument),
    });
    this.api.root.addMethod('ANY');
    this.api.root.addResource('personalize');

    this.credentialsRole = new iam.Role(this, 'ApigwCredentialRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        { managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AWSLambdaFullAccess' },
        { managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonKinesisFullAccess' },
      ]
    });

    this.apiRequestModels = {
      CreateSchemaModel: this.registerCreateSchemaModel(),
    };

    const simsHrnnModel = this.registerSimsHrnnModel();
    this.statesRequestModels = {
      SimsModel: simsHrnnModel,
      RankingModel: simsHrnnModel,
      UserPersonalizationModel: this.registerUserPersonalizationModel(),
      MetadataDatasetModel: this.registerMetadataDatasetModel(),
      InteractionsDatasetModel: this.registerInteractionsDatasetModel(),
      BatchInferenceModel: this.registerBatchInferenceModel(),
      TrainRecipeModel: this.registerTrainRecipeModel(),
      CleanupModel: this.registerCleanupModel(),
    };

    this.eventRequestModels = {
      PutEventsModel: this.registerPutEventsModel(),
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
    }
  }

  // Apis Models
  registerCreateSchemaModel() {
    return this.api.addModel(`ApiCreateSchemaModel`, {
      contentType: 'application/json',
      modelName: 'ApiCreateSchema',
      schema: {
        description: 'create schema',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING
          },
          schema: {
            type: apigw.JsonSchemaType.STRING
          },
        },
        required: ['name', 'schema'],
      },
    });
  }

  // States Models
  registerSimsHrnnModel() {
    return this.api.addModel(`StatesSimsHrnnModel`, {
      contentType: 'application/json',
      modelName: 'StatesSimsHrnnModel',
      schema: {
        description: 'start sims / hrnn / ranking pipeline',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING
          },
          schema_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          bucket: {
            type: apigw.JsonSchemaType.STRING
          },
          perform_hpo: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING
          },
          deploy: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              }
            }
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
                }
              },
            }
          }
        },
        required: ['name', 'schema_arn', 'bucket'],
      },
    });
  }

  registerUserPersonalizationModel() {
    return this.api.addModel(`StatesUserPersonalizationModel`, {
      contentType: 'application/json',
      modelName: 'StatesUserPersonalizationModel',
      schema: {
        description: 'start user-personalization pipeline',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING
          },
          schema_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          bucket: {
            type: apigw.JsonSchemaType.STRING
          },
          item_schema_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          item_bucket: {
            type: apigw.JsonSchemaType.STRING
          },
          user_schema_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          user_bucket: {
            type: apigw.JsonSchemaType.STRING
          },
          perform_hpo: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING
          },
          deploy: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              }
            }
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
                }
              },
            }
          }
        },
        required: ['name', 'schema_arn', 'bucket'],
      },
    });
  }

  registerMetadataDatasetModel() {
    return this.api.addModel(`StatesMetadataDatasetModel`, {
      contentType: 'application/json',
      modelName: 'StatesMetadataDatasetModel',
      schema: {
        description: 'import new metadata and create campaign',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING
          },
          item_schema_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          item_bucket: {
            type: apigw.JsonSchemaType.STRING
          },
          user_schema_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          user_bucket: {
            type: apigw.JsonSchemaType.STRING
          },
          perform_hpo: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING
          },
          deploy: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              }
            }
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
                }
              },
            }
          }
        },
        required: ['name'],
      },
    });
  }

  registerInteractionsDatasetModel() {
    return this.api.addModel(`StatesInteractionsDatasetModel`, {
      contentType: 'application/json',
      modelName: 'StatesInteractionsDatasetModel',
      schema: {
        description: 'import new interaction dataset and create campaign',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING
          },
          schema_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          bucket: {
            type: apigw.JsonSchemaType.STRING
          },
          recipe_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          perform_hpo: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING
          },
          deploy: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              }
            }
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
                }
              },
            }
          }
        },
        required: ['name', 'schema_arn', 'bucket', 'recipe_arn'],
      },
    });
  }

  registerBatchInferenceModel() {
    return this.api.addModel(`StatesBatchInferenceModel`, {
      contentType: 'application/json',
      modelName: 'StatesBatchInferenceModel',
      schema: {
        description: 'start batch inference pipeline',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING,
          },
          solution_version_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          input_path: {
            type: apigw.JsonSchemaType.STRING
          },
          output_path: {
            type: apigw.JsonSchemaType.STRING
          },
          num_results: {
            type: apigw.JsonSchemaType.INTEGER
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
                }
              },
            }
          }
        },
        required: ['name', 'solution_version_arn', 'input_path', 'output_path'],
      },
    });
  }

  registerTrainRecipeModel() {
    return this.api.addModel(`StatesTrainRecipe`, {
      contentType: 'application/json',
      modelName: 'StatesTrainRecipe',
      schema: {
        description: 'create campaign with given recipe for existing dataset',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING
          },
          recipe_arn: {
            type: apigw.JsonSchemaType.STRING
          },
          perform_hpo: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING
          },
          deploy: {
            type: apigw.JsonSchemaType.BOOLEAN
          },
          solution_config: {
            type: apigw.JsonSchemaType.OBJECT,
            properties: {
              eventValueThreshold: {
                type: apigw.JsonSchemaType.STRING
              },
              hpoConfig: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              algorithmHyperParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              },
              featureTransformationParameters: {
                type: apigw.JsonSchemaType.OBJECT,
              }
            }
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
                }
              },
            }
          }
        },
        required: ['name', 'recipe_arn'],
      },
    });
  }

  registerCleanupModel() {
    return this.api.addModel(`StatesCleanupModel`, {
      contentType: 'application/json',
      modelName: 'StatesCleanupModel',
      schema: {
        description: 'clean up dataset-group and its related resources',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          name: {
            type: apigw.JsonSchemaType.STRING
          },
        },
        required: ['name'],
      },
    });
  }

  // Event Models
  registerPutEventsModel() {
    return this.api.addModel(`PutEventsModel`, {
      contentType: 'application/json',
      modelName: 'PutEventsModel',
      schema: {
        description: 'put event to personalize asynchronously',
        type: apigw.JsonSchemaType.OBJECT,
        properties: {
          tracking_id: {
            type: apigw.JsonSchemaType.STRING
          },
          session_id: {
            type: apigw.JsonSchemaType.STRING
          },
          event_type: {
            type: apigw.JsonSchemaType.STRING
          },
          event_value: {
            type: apigw.JsonSchemaType.NUMBER
          },
          user_id: {
            type: apigw.JsonSchemaType.STRING
          },
          item_id: {
            type: apigw.JsonSchemaType.STRING
          },
          sent_at: {
            description: 'unix timestamp',
            type: apigw.JsonSchemaType.INTEGER
          },
          properties: {
            description: 'A string map of event-specific data that you might choose to record',
            type: apigw.JsonSchemaType.OBJECT
          },
          recommendation_id: {
            type: apigw.JsonSchemaType.STRING
          },
          impression: {
            description: 'list of item IDs',
            type: apigw.JsonSchemaType.ARRAY
          },
        },
        required: ['tracking_id', 'session_id', 'event_type', 'user_id', 'item_id', 'sent_at'],
      },
    });
  }
}