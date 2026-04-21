import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
export interface WafConfigProps {
    environment: 'dev' | 'staging' | 'production';
    scope: 'CLOUDFRONT' | 'REGIONAL';
    resourceArn?: string;
}
export declare class WafConfig extends Construct {
    readonly webAcl: wafv2.CfnWebACL;
    constructor(scope: Construct, id: string, props: WafConfigProps);
    /**
     * Associate WAF Web ACL with a resource (API Gateway or CloudFront)
     */
    associateWithResource(resourceArn: string): wafv2.CfnWebACLAssociation;
}
