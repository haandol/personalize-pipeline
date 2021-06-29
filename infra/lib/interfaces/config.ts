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

export const ns = 'PersonalizePipelineDev';

export const StackProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
};

/*
 * TODO: replace email and slack notifycation address
 *
 * @notifySender    // sender's email address, e.g. DongGyun Lee <dongkyl@amazon.com>
 * @notifyEmail     // receiver's email address
 * @notifySlack     // webhook url for slack notification
 * @notifyChime     // webhook url for chime notification
 */
export const AppContext = {
  ns,
  notifySender: '',
  notifyEmail: '',
  notifySlack: '',
  notifyChime: '',
}