import * as path from 'path';
import * as joi from 'joi';
import * as toml from 'toml';
import * as fs from 'fs';

interface IConfig {
  app: {
    ns: string;
    stage: string;
  };
  aws: {
    region: string;
  };
  vpc?: {
    id: string;
    endpointId: string;
    endpointSecurityGroupIds: string[];
  };
  notification: {
    emailSender?: string;
    emailReceiver?: string;
    slackWebhook?: string;
    chimeWebhook?: string;
  };
}

const cfg = toml.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '.toml'), 'utf-8')
);
console.log('loaded config', cfg);

const schema = joi
  .object({
    app: joi.object({
      ns: joi.string().required(),
      stage: joi.string().required(),
    }),
    aws: joi.object({
      region: joi.string().required(),
    }),
    vpc: joi
      .object({
        id: joi.string(),
        endpointId: joi.string(),
        endpointSecurityGroupIds: joi.array().items(joi.string()),
      })
      .optional(),
    notification: joi.object({
      emailSender: joi.string().optional(),
      emailReceiver: joi.string().optional(),
      slackWebhook: joi.string().optional(),
      chimeWebhook: joi.string().optional(),
    }),
  })
  .unknown();

const { error } = schema.validate(cfg);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const Config: IConfig = {
  ...cfg,
  app: {
    ...cfg.app,
    ns: `${cfg.app.ns}${cfg.app.stage}`,
  },
};
