#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const production_deployment_1 = require("./production-deployment");
const app = new cdk.App();
// Deploy Production Infrastructure Stack for Task 7.2
const productionStack = new cdk.Stack(app, 'MisraPlatformProductionStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    description: 'MISRA Production SaaS Platform - Production Infrastructure (Task 7.2)',
});
// Add the production deployment construct to the stack
new production_deployment_1.ProductionDeploymentStack(productionStack, 'ProductionDeployment');
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdGlvbi1hcHAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9kdWN0aW9uLWFwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBcUM7QUFDckMsaURBQW1DO0FBQ25DLG1FQUFvRTtBQUVwRSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixzREFBc0Q7QUFDdEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSw4QkFBOEIsRUFBRTtJQUN6RSxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksV0FBVztLQUN0RDtJQUNELFdBQVcsRUFBRSx1RUFBdUU7Q0FDckYsQ0FBQyxDQUFDO0FBRUgsdURBQXVEO0FBQ3ZELElBQUksaURBQXlCLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUM7QUFFdkUsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IFByb2R1Y3Rpb25EZXBsb3ltZW50U3RhY2sgfSBmcm9tICcuL3Byb2R1Y3Rpb24tZGVwbG95bWVudCc7XHJcblxyXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xyXG5cclxuLy8gRGVwbG95IFByb2R1Y3Rpb24gSW5mcmFzdHJ1Y3R1cmUgU3RhY2sgZm9yIFRhc2sgNy4yXHJcbmNvbnN0IHByb2R1Y3Rpb25TdGFjayA9IG5ldyBjZGsuU3RhY2soYXBwLCAnTWlzcmFQbGF0Zm9ybVByb2R1Y3Rpb25TdGFjaycsIHtcclxuICBlbnY6IHtcclxuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXHJcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICB9LFxyXG4gIGRlc2NyaXB0aW9uOiAnTUlTUkEgUHJvZHVjdGlvbiBTYWFTIFBsYXRmb3JtIC0gUHJvZHVjdGlvbiBJbmZyYXN0cnVjdHVyZSAoVGFzayA3LjIpJyxcclxufSk7XHJcblxyXG4vLyBBZGQgdGhlIHByb2R1Y3Rpb24gZGVwbG95bWVudCBjb25zdHJ1Y3QgdG8gdGhlIHN0YWNrXHJcbm5ldyBQcm9kdWN0aW9uRGVwbG95bWVudFN0YWNrKHByb2R1Y3Rpb25TdGFjaywgJ1Byb2R1Y3Rpb25EZXBsb3ltZW50Jyk7XHJcblxyXG5hcHAuc3ludGgoKTsiXX0=