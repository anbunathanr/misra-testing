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
exports.ProjectsTable = void 0;
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class ProjectsTable extends constructs_1.Construct {
    table;
    constructor(scope, id) {
        super(scope, id);
        this.table = new dynamodb.Table(this, 'ProjectsTable', {
            tableName: 'TestProjects',
            partitionKey: {
                name: 'projectId',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN,
            pointInTimeRecovery: true,
        });
        // GSI for querying projects by user
        this.table.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: {
                name: 'userId',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });
    }
}
exports.ProjectsTable = ProjectsTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdHMtdGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9qZWN0cy10YWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtRUFBcUQ7QUFDckQsMkNBQXVDO0FBQ3ZDLDZDQUE0QztBQUU1QyxNQUFhLGFBQWMsU0FBUSxzQkFBUztJQUMxQixLQUFLLENBQWlCO0lBRXRDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUNyRCxTQUFTLEVBQUUsY0FBYztZQUN6QixZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELGFBQWEsRUFBRSwyQkFBYSxDQUFDLE1BQU07WUFDbkMsbUJBQW1CLEVBQUUsSUFBSTtTQUMxQixDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQztZQUNqQyxTQUFTLEVBQUUsV0FBVztZQUN0QixZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELGNBQWMsRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLEdBQUc7U0FDNUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBM0JELHNDQTJCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWInO1xyXG5cclxuZXhwb3J0IGNsYXNzIFByb2plY3RzVGFibGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSB0YWJsZTogZHluYW1vZGIuVGFibGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgdGhpcy50YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUHJvamVjdHNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnVGVzdFByb2plY3RzJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3Byb2plY3RJZCcsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR1NJIGZvciBxdWVyeWluZyBwcm9qZWN0cyBieSB1c2VyXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnVXNlckluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3VzZXJJZCcsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19