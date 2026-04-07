"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_3_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 3.2
 * Line-splicing shall not be used in // comments.
 */
class Rule_C_3_2 {
    id = 'MISRA-C-3.2';
    description = 'Line-splicing shall not be used in // comments';
    severity = 'required';
    category = 'Comments';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check for backslash at end of // comment
            if (line.includes('//')) {
                const commentStart = line.indexOf('//');
                const afterComment = line.substring(commentStart);
                if (afterComment.trimEnd().endsWith('\\')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.length - 1, 'Line-splicing (backslash) used in // comment', line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_3_2 = Rule_C_3_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTMtMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLGdEQUFnRCxDQUFDO0lBQy9ELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDdEIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdEIsMkNBQTJDO1lBQzNDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN4QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDMUMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ2YsOENBQThDLEVBQzlDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDWixDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBbENELGdDQWtDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAzLjJcclxuICogTGluZS1zcGxpY2luZyBzaGFsbCBub3QgYmUgdXNlZCBpbiAvLyBjb21tZW50cy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfM18yIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTMuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnTGluZS1zcGxpY2luZyBzaGFsbCBub3QgYmUgdXNlZCBpbiAvLyBjb21tZW50cyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0NvbW1lbnRzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBiYWNrc2xhc2ggYXQgZW5kIG9mIC8vIGNvbW1lbnRcclxuICAgICAgaWYgKGxpbmUuaW5jbHVkZXMoJy8vJykpIHtcclxuICAgICAgICBjb25zdCBjb21tZW50U3RhcnQgPSBsaW5lLmluZGV4T2YoJy8vJyk7XHJcbiAgICAgICAgY29uc3QgYWZ0ZXJDb21tZW50ID0gbGluZS5zdWJzdHJpbmcoY29tbWVudFN0YXJ0KTtcclxuICAgICAgICBpZiAoYWZ0ZXJDb21tZW50LnRyaW1FbmQoKS5lbmRzV2l0aCgnXFxcXCcpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIGxpbmUubGVuZ3RoIC0gMSxcclxuICAgICAgICAgICAgICAnTGluZS1zcGxpY2luZyAoYmFja3NsYXNoKSB1c2VkIGluIC8vIGNvbW1lbnQnLFxyXG4gICAgICAgICAgICAgIGxpbmUudHJpbSgpXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==