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

/*
 * TODO: replace vpc-id with yours for Private ApiGateway
 *
 * @vpcId                 id of VPC
 * @vpceId                id of VPC Endpoint for API Gateway(execute-api)
 * @vpceSecurityGroupIds  id(s) of VPC Endpoint for API Gateway(execute-api)
 * 
 * no vpc endpoint id is given, code will generate it for you
 */
export const VpcProps = {
  vpcId: '',
  vpceId: '',
  vpceSecurityGroupIds: [],
  availabilityZones: ['ap-northeast-2a', 'ap-northeast-2b', 'ap-northeast-2c'],
}

/*
 * TODO: replace account and region with yours
 * 
 * @account   account id, e.g. 929831892372
 * @region    region of VPC, e.g. ap-northeast-2
 */
export const StackProps = {
  env: {
    account: '',
    region: 'ap-northeast-2',
  }
};

export const ns = 'PersonalizeAlpha';

/*
 * TODO: replace email and slack notifycation address
 *
 * @notifySender    // sender's email address, e.g. DongGyun Lee <dongkyl@amazon.com>
 * @notifyEmail     // receiver's email address
 * @notifySlack     // webhook url for slack notification
 */
export const AppContext = {
  ns,
  notifySender: '',
  notifyEmail: '',
  notifySlack: '',
}