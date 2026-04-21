import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface WafConfigProps {
  environment: 'dev' | 'staging' | 'production';
  scope: 'CLOUDFRONT' | 'REGIONAL';
  resourceArn?: string;
}

export class WafConfig extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafConfigProps) {
    super(scope, id);

    const { environment, scope: wafScope } = props;

    // Create WAF Web ACL with managed rule sets
    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: `misra-platform-waf-${environment}`,
      scope: wafScope,
      defaultAction: { allow: {} },
      description: `WAF for MISRA Platform ${environment} environment`,
      
      rules: [
        // Rule 1: Rate limiting to prevent DDoS attacks
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: environment === 'production' ? 2000 : 500,
              aggregateKeyType: 'IP',
            },
          },
          action: {
            block: {
              customResponse: {
                responseCode: 429,
                customResponseBodyKey: 'rate-limit-exceeded',
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
          },
        },

        // Rule 2: AWS Managed Rules - Core Rule Set (CRS)
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: [],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
          },
        },

        // Rule 3: AWS Managed Rules - Known Bad Inputs
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
              excludedRules: [],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesKnownBadInputsRuleSet',
          },
        },

        // Rule 4: AWS Managed Rules - SQL Injection Protection
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 4,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
              excludedRules: [],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesSQLiRuleSet',
          },
        },

        // Rule 5: AWS Managed Rules - Linux Operating System Protection
        {
          name: 'AWSManagedRulesLinuxRuleSet',
          priority: 5,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesLinuxRuleSet',
              excludedRules: [],
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesLinuxRuleSet',
          },
        },

        // Rule 6: Block requests with missing or invalid User-Agent
        {
          name: 'BlockMissingUserAgent',
          priority: 6,
          statement: {
            notStatement: {
              statement: {
                byteMatchStatement: {
                  searchString: 'Mozilla',
                  fieldToMatch: {
                    singleHeader: {
                      name: 'user-agent',
                    },
                  },
                  textTransformations: [
                    {
                      priority: 0,
                      type: 'NONE',
                    },
                  ],
                  positionalConstraint: 'CONTAINS',
                },
              },
            },
          },
          action: {
            block: {
              customResponse: {
                responseCode: 403,
                customResponseBodyKey: 'invalid-user-agent',
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'BlockMissingUserAgent',
          },
        },

        // Rule 7: Geo-blocking (optional - can be configured per environment)
        ...(environment === 'production' ? [{
          name: 'GeoBlockingRule',
          priority: 7,
          statement: {
            notStatement: {
              statement: {
                geoMatchStatement: {
                  // Allow only specific countries (example: US, CA, GB, EU countries)
                  countryCodes: ['US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'NO', 'DK', 'FI'],
                },
              },
            },
          },
          action: {
            block: {
              customResponse: {
                responseCode: 403,
                customResponseBodyKey: 'geo-blocked',
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GeoBlockingRule',
          },
        }] : []),
      ],

      // Custom response bodies for blocked requests
      customResponseBodies: {
        'rate-limit-exceeded': {
          contentType: 'APPLICATION_JSON',
          content: JSON.stringify({
            error: 'Rate Limit Exceeded',
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        },
        'invalid-user-agent': {
          contentType: 'APPLICATION_JSON',
          content: JSON.stringify({
            error: 'Invalid Request',
            message: 'Invalid or missing User-Agent header.',
            code: 'INVALID_USER_AGENT',
          }),
        },
        'geo-blocked': {
          contentType: 'APPLICATION_JSON',
          content: JSON.stringify({
            error: 'Access Denied',
            message: 'Access from your location is not permitted.',
            code: 'GEO_BLOCKED',
          }),
        },
      },

      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `misra-platform-waf-${environment}`,
      },
    });

    // Create CloudWatch log group for WAF logs
    const logGroupName = `aws-waf-logs-misra-platform-${environment}`;
    
    // Enable WAF logging
    new wafv2.CfnLoggingConfiguration(this, 'WafLogging', {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [
        `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:${logGroupName}`,
      ],
      loggingFilter: {
        defaultBehavior: 'KEEP',
        filters: [
          {
            behavior: 'KEEP',
            conditions: [
              {
                actionCondition: {
                  action: 'BLOCK',
                },
              },
            ],
            requirement: 'MEETS_ANY',
          },
        ],
      },
    });

    // Output WAF Web ACL ARN
    new cdk.CfnOutput(this, 'WebAclArn', {
      value: this.webAcl.attrArn,
      description: `WAF Web ACL ARN for ${environment}`,
      exportName: `${cdk.Stack.of(this).stackName}-WafWebAclArn`,
    });

    new cdk.CfnOutput(this, 'WebAclId', {
      value: this.webAcl.attrId,
      description: `WAF Web ACL ID for ${environment}`,
      exportName: `${cdk.Stack.of(this).stackName}-WafWebAclId`,
    });
  }

  /**
   * Associate WAF Web ACL with a resource (API Gateway or CloudFront)
   */
  public associateWithResource(resourceArn: string): wafv2.CfnWebACLAssociation {
    return new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
      resourceArn,
      webAclArn: this.webAcl.attrArn,
    });
  }
}
