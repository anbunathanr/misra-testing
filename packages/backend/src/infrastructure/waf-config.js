"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WafConfig = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const wafv2 = __importStar(require("aws-cdk-lib/aws-wafv2"));
const constructs_1 = require("constructs");
class WafConfig extends constructs_1.Construct {
    webAcl;
    constructor(scope, id, props) {
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
    associateWithResource(resourceArn) {
        return new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
            resourceArn,
            webAclArn: this.webAcl.attrArn,
        });
    }
}
exports.WafConfig = WafConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2FmLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndhZi1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLDZEQUErQztBQUMvQywyQ0FBdUM7QUFRdkMsTUFBYSxTQUFVLFNBQVEsc0JBQVM7SUFDdEIsTUFBTSxDQUFrQjtJQUV4QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFCO1FBQzdELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRS9DLDRDQUE0QztRQUM1QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQ2hELElBQUksRUFBRSxzQkFBc0IsV0FBVyxFQUFFO1lBQ3pDLEtBQUssRUFBRSxRQUFRO1lBQ2YsYUFBYSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM1QixXQUFXLEVBQUUsMEJBQTBCLFdBQVcsY0FBYztZQUVoRSxLQUFLLEVBQUU7Z0JBQ0wsZ0RBQWdEO2dCQUNoRDtvQkFDRSxJQUFJLEVBQUUsZUFBZTtvQkFDckIsUUFBUSxFQUFFLENBQUM7b0JBQ1gsU0FBUyxFQUFFO3dCQUNULGtCQUFrQixFQUFFOzRCQUNsQixLQUFLLEVBQUUsV0FBVyxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHOzRCQUNoRCxnQkFBZ0IsRUFBRSxJQUFJO3lCQUN2QjtxQkFDRjtvQkFDRCxNQUFNLEVBQUU7d0JBQ04sS0FBSyxFQUFFOzRCQUNMLGNBQWMsRUFBRTtnQ0FDZCxZQUFZLEVBQUUsR0FBRztnQ0FDakIscUJBQXFCLEVBQUUscUJBQXFCOzZCQUM3Qzt5QkFD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QU07Z0JBQ3ZCLE9BQU8sRUFBRTtvQkFDUDt3QkFDRSxRQUFRLEVBQUUsTUFBTTt3QkFDaEIsVUFBVSxFQUFFOzRCQUNWO2dDQUNFLGVBQWUsRUFBRTtvQ0FDZixNQUFNLEVBQUUsT0FBTztpQ0FDaEI7NkJBQ0Y7eUJBQ0Y7d0JBQ0QsV0FBVyxFQUFFLFdBQVc7cUJBQ3pCO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCx5QkFBeUI7UUFDekIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTztZQUMxQixXQUFXLEVBQUUsdUJBQXVCLFdBQVcsRUFBRTtZQUNqRCxVQUFVLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLGVBQWU7U0FDM0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDbEMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtZQUN6QixXQUFXLEVBQUUsc0JBQXNCLFdBQVcsRUFBRTtZQUNoRCxVQUFVLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLGNBQWM7U0FDMUQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0kscUJBQXFCLENBQUMsV0FBbUI7UUFDOUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDL0QsV0FBVztZQUNYLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU87U0FDL0IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBaFJELDhCQWdSQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIHdhZnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy13YWZ2Mic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXYWZDb25maWdQcm9wcyB7XHJcbiAgZW52aXJvbm1lbnQ6ICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nO1xyXG4gIHNjb3BlOiAnQ0xPVURGUk9OVCcgfCAnUkVHSU9OQUwnO1xyXG4gIHJlc291cmNlQXJuPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgV2FmQ29uZmlnIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgd2ViQWNsOiB3YWZ2Mi5DZm5XZWJBQ0w7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBXYWZDb25maWdQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCB7IGVudmlyb25tZW50LCBzY29wZTogd2FmU2NvcGUgfSA9IHByb3BzO1xyXG5cclxuICAgIC8vIENyZWF0ZSBXQUYgV2ViIEFDTCB3aXRoIG1hbmFnZWQgcnVsZSBzZXRzXHJcbiAgICB0aGlzLndlYkFjbCA9IG5ldyB3YWZ2Mi5DZm5XZWJBQ0wodGhpcywgJ1dlYkFjbCcsIHtcclxuICAgICAgbmFtZTogYG1pc3JhLXBsYXRmb3JtLXdhZi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHNjb3BlOiB3YWZTY29wZSxcclxuICAgICAgZGVmYXVsdEFjdGlvbjogeyBhbGxvdzoge30gfSxcclxuICAgICAgZGVzY3JpcHRpb246IGBXQUYgZm9yIE1JU1JBIFBsYXRmb3JtICR7ZW52aXJvbm1lbnR9IGVudmlyb25tZW50YCxcclxuICAgICAgXHJcbiAgICAgIHJ1bGVzOiBbXHJcbiAgICAgICAgLy8gUnVsZSAxOiBSYXRlIGxpbWl0aW5nIHRvIHByZXZlbnQgRERvUyBhdHRhY2tzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ1JhdGVMaW1pdFJ1bGUnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDEsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgcmF0ZUJhc2VkU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgbGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAyMDAwIDogNTAwLFxyXG4gICAgICAgICAgICAgIGFnZ3JlZ2F0ZUtleVR5cGU6ICdJUCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgIGJsb2NrOiB7XHJcbiAgICAgICAgICAgICAgY3VzdG9tUmVzcG9uc2U6IHtcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlQ29kZTogNDI5LFxyXG4gICAgICAgICAgICAgICAgY3VzdG9tUmVzcG9uc2VCb2R5S2V5OiAncmF0ZS1saW1pdC1leGNlZWRlZCcsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1JhdGVMaW1pdFJ1bGUnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyBSdWxlIDI6IEFXUyBNYW5hZ2VkIFJ1bGVzIC0gQ29yZSBSdWxlIFNldCAoQ1JTKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JyxcclxuICAgICAgICAgIHByaW9yaXR5OiAyLFxyXG4gICAgICAgICAgc3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICB2ZW5kb3JOYW1lOiAnQVdTJyxcclxuICAgICAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzQ29tbW9uUnVsZVNldCcsXHJcbiAgICAgICAgICAgICAgZXhjbHVkZWRSdWxlczogW10sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcclxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcclxuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQVdTTWFuYWdlZFJ1bGVzQ29tbW9uUnVsZVNldCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8vIFJ1bGUgMzogQVdTIE1hbmFnZWQgUnVsZXMgLSBLbm93biBCYWQgSW5wdXRzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCcsXHJcbiAgICAgICAgICBwcmlvcml0eTogMyxcclxuICAgICAgICAgIHN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXHJcbiAgICAgICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCcsXHJcbiAgICAgICAgICAgICAgZXhjbHVkZWRSdWxlczogW10sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcclxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcclxuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQVdTTWFuYWdlZFJ1bGVzS25vd25CYWRJbnB1dHNSdWxlU2V0JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gUnVsZSA0OiBBV1MgTWFuYWdlZCBSdWxlcyAtIFNRTCBJbmplY3Rpb24gUHJvdGVjdGlvblxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNTUUxpUnVsZVNldCcsXHJcbiAgICAgICAgICBwcmlvcml0eTogNCxcclxuICAgICAgICAgIHN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXHJcbiAgICAgICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc1NRTGlSdWxlU2V0JyxcclxuICAgICAgICAgICAgICBleGNsdWRlZFJ1bGVzOiBbXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBvdmVycmlkZUFjdGlvbjogeyBub25lOiB7fSB9LFxyXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xyXG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdBV1NNYW5hZ2VkUnVsZXNTUUxpUnVsZVNldCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8vIFJ1bGUgNTogQVdTIE1hbmFnZWQgUnVsZXMgLSBMaW51eCBPcGVyYXRpbmcgU3lzdGVtIFByb3RlY3Rpb25cclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzTGludXhSdWxlU2V0JyxcclxuICAgICAgICAgIHByaW9yaXR5OiA1LFxyXG4gICAgICAgICAgc3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICB2ZW5kb3JOYW1lOiAnQVdTJyxcclxuICAgICAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzTGludXhSdWxlU2V0JyxcclxuICAgICAgICAgICAgICBleGNsdWRlZFJ1bGVzOiBbXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBvdmVycmlkZUFjdGlvbjogeyBub25lOiB7fSB9LFxyXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xyXG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdBV1NNYW5hZ2VkUnVsZXNMaW51eFJ1bGVTZXQnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyBSdWxlIDY6IEJsb2NrIHJlcXVlc3RzIHdpdGggbWlzc2luZyBvciBpbnZhbGlkIFVzZXItQWdlbnRcclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnQmxvY2tNaXNzaW5nVXNlckFnZW50JyxcclxuICAgICAgICAgIHByaW9yaXR5OiA2LFxyXG4gICAgICAgICAgc3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgIG5vdFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgIHN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgICAgYnl0ZU1hdGNoU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgIHNlYXJjaFN0cmluZzogJ01vemlsbGEnLFxyXG4gICAgICAgICAgICAgICAgICBmaWVsZFRvTWF0Y2g6IHtcclxuICAgICAgICAgICAgICAgICAgICBzaW5nbGVIZWFkZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICd1c2VyLWFnZW50JyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICB0ZXh0VHJhbnNmb3JtYXRpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnTk9ORScsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgICAgcG9zaXRpb25hbENvbnN0cmFpbnQ6ICdDT05UQUlOUycsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgIGJsb2NrOiB7XHJcbiAgICAgICAgICAgICAgY3VzdG9tUmVzcG9uc2U6IHtcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlQ29kZTogNDAzLFxyXG4gICAgICAgICAgICAgICAgY3VzdG9tUmVzcG9uc2VCb2R5S2V5OiAnaW52YWxpZC11c2VyLWFnZW50JyxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcclxuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQmxvY2tNaXNzaW5nVXNlckFnZW50JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gUnVsZSA3OiBHZW8tYmxvY2tpbmcgKG9wdGlvbmFsIC0gY2FuIGJlIGNvbmZpZ3VyZWQgcGVyIGVudmlyb25tZW50KVxyXG4gICAgICAgIC4uLihlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gW3tcclxuICAgICAgICAgIG5hbWU6ICdHZW9CbG9ja2luZ1J1bGUnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDcsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgbm90U3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgc3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgICBnZW9NYXRjaFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgICAgICAvLyBBbGxvdyBvbmx5IHNwZWNpZmljIGNvdW50cmllcyAoZXhhbXBsZTogVVMsIENBLCBHQiwgRVUgY291bnRyaWVzKVxyXG4gICAgICAgICAgICAgICAgICBjb3VudHJ5Q29kZXM6IFsnVVMnLCAnQ0EnLCAnR0InLCAnREUnLCAnRlInLCAnSVQnLCAnRVMnLCAnTkwnLCAnQkUnLCAnU0UnLCAnTk8nLCAnREsnLCAnRkknXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBhY3Rpb246IHtcclxuICAgICAgICAgICAgYmxvY2s6IHtcclxuICAgICAgICAgICAgICBjdXN0b21SZXNwb25zZToge1xyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2VDb2RlOiA0MDMsXHJcbiAgICAgICAgICAgICAgICBjdXN0b21SZXNwb25zZUJvZHlLZXk6ICdnZW8tYmxvY2tlZCcsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0dlb0Jsb2NraW5nUnVsZScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH1dIDogW10pLFxyXG4gICAgICBdLFxyXG5cclxuICAgICAgLy8gQ3VzdG9tIHJlc3BvbnNlIGJvZGllcyBmb3IgYmxvY2tlZCByZXF1ZXN0c1xyXG4gICAgICBjdXN0b21SZXNwb25zZUJvZGllczoge1xyXG4gICAgICAgICdyYXRlLWxpbWl0LWV4Y2VlZGVkJzoge1xyXG4gICAgICAgICAgY29udGVudFR5cGU6ICdBUFBMSUNBVElPTl9KU09OJyxcclxuICAgICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6ICdSYXRlIExpbWl0IEV4Y2VlZGVkJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ1RvbyBtYW55IHJlcXVlc3RzLiBQbGVhc2UgdHJ5IGFnYWluIGxhdGVyLicsXHJcbiAgICAgICAgICAgIGNvZGU6ICdSQVRFX0xJTUlUX0VYQ0VFREVEJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgJ2ludmFsaWQtdXNlci1hZ2VudCc6IHtcclxuICAgICAgICAgIGNvbnRlbnRUeXBlOiAnQVBQTElDQVRJT05fSlNPTicsXHJcbiAgICAgICAgICBjb250ZW50OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGVycm9yOiAnSW52YWxpZCBSZXF1ZXN0JyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0ludmFsaWQgb3IgbWlzc2luZyBVc2VyLUFnZW50IGhlYWRlci4nLFxyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9VU0VSX0FHRU5UJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgJ2dlby1ibG9ja2VkJzoge1xyXG4gICAgICAgICAgY29udGVudFR5cGU6ICdBUFBMSUNBVElPTl9KU09OJyxcclxuICAgICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6ICdBY2Nlc3MgRGVuaWVkJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0FjY2VzcyBmcm9tIHlvdXIgbG9jYXRpb24gaXMgbm90IHBlcm1pdHRlZC4nLFxyXG4gICAgICAgICAgICBjb2RlOiAnR0VPX0JMT0NLRUQnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcclxuICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiBgbWlzcmEtcGxhdGZvcm0td2FmLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGxvZyBncm91cCBmb3IgV0FGIGxvZ3NcclxuICAgIGNvbnN0IGxvZ0dyb3VwTmFtZSA9IGBhd3Mtd2FmLWxvZ3MtbWlzcmEtcGxhdGZvcm0tJHtlbnZpcm9ubWVudH1gO1xyXG4gICAgXHJcbiAgICAvLyBFbmFibGUgV0FGIGxvZ2dpbmdcclxuICAgIG5ldyB3YWZ2Mi5DZm5Mb2dnaW5nQ29uZmlndXJhdGlvbih0aGlzLCAnV2FmTG9nZ2luZycsIHtcclxuICAgICAgcmVzb3VyY2VBcm46IHRoaXMud2ViQWNsLmF0dHJBcm4sXHJcbiAgICAgIGxvZ0Rlc3RpbmF0aW9uQ29uZmlnczogW1xyXG4gICAgICAgIGBhcm46YXdzOmxvZ3M6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufToke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fTpsb2ctZ3JvdXA6JHtsb2dHcm91cE5hbWV9YCxcclxuICAgICAgXSxcclxuICAgICAgbG9nZ2luZ0ZpbHRlcjoge1xyXG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjogJ0tFRVAnLFxyXG4gICAgICAgIGZpbHRlcnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgYmVoYXZpb3I6ICdLRUVQJyxcclxuICAgICAgICAgICAgY29uZGl0aW9uczogW1xyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbkNvbmRpdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgICBhY3Rpb246ICdCTE9DSycsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlcXVpcmVtZW50OiAnTUVFVFNfQU5ZJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCBXQUYgV2ViIEFDTCBBUk5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJBY2xBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLndlYkFjbC5hdHRyQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYFdBRiBXZWIgQUNMIEFSTiBmb3IgJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtjZGsuU3RhY2sub2YodGhpcykuc3RhY2tOYW1lfS1XYWZXZWJBY2xBcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYkFjbElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy53ZWJBY2wuYXR0cklkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYFdBRiBXZWIgQUNMIElEIGZvciAke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke2Nkay5TdGFjay5vZih0aGlzKS5zdGFja05hbWV9LVdhZldlYkFjbElkYCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQXNzb2NpYXRlIFdBRiBXZWIgQUNMIHdpdGggYSByZXNvdXJjZSAoQVBJIEdhdGV3YXkgb3IgQ2xvdWRGcm9udClcclxuICAgKi9cclxuICBwdWJsaWMgYXNzb2NpYXRlV2l0aFJlc291cmNlKHJlc291cmNlQXJuOiBzdHJpbmcpOiB3YWZ2Mi5DZm5XZWJBQ0xBc3NvY2lhdGlvbiB7XHJcbiAgICByZXR1cm4gbmV3IHdhZnYyLkNmbldlYkFDTEFzc29jaWF0aW9uKHRoaXMsICdXZWJBY2xBc3NvY2lhdGlvbicsIHtcclxuICAgICAgcmVzb3VyY2VBcm4sXHJcbiAgICAgIHdlYkFjbEFybjogdGhpcy53ZWJBY2wuYXR0ckFybixcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=