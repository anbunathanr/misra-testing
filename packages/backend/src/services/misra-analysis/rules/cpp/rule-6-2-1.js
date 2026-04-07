"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_6_2_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 6-2-1
 * Assignment operators shall not be used in sub-expressions.
 * Detects assignment operators (=, +=, -=, etc.) used within larger expressions.
 */
class Rule_CPP_6_2_1 {
    id = 'MISRA-CPP-6.2.1';
    description = 'Assignment operators shall not be used in sub-expressions';
    severity = 'required';
    category = 'Expressions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect assignment in conditions: if (x = y), while (x = y)
        const assignInConditionRegex = /\b(if|while|for)\s*\([^)]*\b\w+\s*=\s*[^=]/;
        // Detect assignment in expressions: z = (x = y), func(x = y)
        const assignInExprRegex = /[^=!<>]=\s*\([^)]*\b\w+\s*=\s*[^=]/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Check for assignment in conditions
            if (assignInConditionRegex.test(line)) {
                // Exclude comparison operators (==, !=, <=, >=)
                if (!line.includes('==') || line.indexOf('=') < line.indexOf('==')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Assignment operator used in sub-expression (condition)', line));
                }
            }
            // Check for assignment in expressions
            if (assignInExprRegex.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Assignment operator used in sub-expression', line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_6_2_1 = Rule_CPP_6_2_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTItMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNi0yLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRywyREFBMkQsQ0FBQztJQUMxRSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLDZEQUE2RDtRQUM3RCxNQUFNLHNCQUFzQixHQUFHLDRDQUE0QyxDQUFDO1FBRTVFLDZEQUE2RDtRQUM3RCxNQUFNLGlCQUFpQixHQUFHLG9DQUFvQyxDQUFDO1FBRS9ELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRXJFLHFDQUFxQztZQUNyQyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxnREFBZ0Q7Z0JBQ2hELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNuRSxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0Qsd0RBQXdELEVBQ3hELElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7WUFFRCxzQ0FBc0M7WUFDdEMsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDakMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDRDQUE0QyxFQUM1QyxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFyREQsd0NBcURDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNi0yLTFcclxuICogQXNzaWdubWVudCBvcGVyYXRvcnMgc2hhbGwgbm90IGJlIHVzZWQgaW4gc3ViLWV4cHJlc3Npb25zLlxyXG4gKiBEZXRlY3RzIGFzc2lnbm1lbnQgb3BlcmF0b3JzICg9LCArPSwgLT0sIGV0Yy4pIHVzZWQgd2l0aGluIGxhcmdlciBleHByZXNzaW9ucy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF82XzJfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTYuMi4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdBc3NpZ25tZW50IG9wZXJhdG9ycyBzaGFsbCBub3QgYmUgdXNlZCBpbiBzdWItZXhwcmVzc2lvbnMnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdFeHByZXNzaW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBEZXRlY3QgYXNzaWdubWVudCBpbiBjb25kaXRpb25zOiBpZiAoeCA9IHkpLCB3aGlsZSAoeCA9IHkpXHJcbiAgICBjb25zdCBhc3NpZ25JbkNvbmRpdGlvblJlZ2V4ID0gL1xcYihpZnx3aGlsZXxmb3IpXFxzKlxcKFteKV0qXFxiXFx3K1xccyo9XFxzKltePV0vO1xyXG4gICAgXHJcbiAgICAvLyBEZXRlY3QgYXNzaWdubWVudCBpbiBleHByZXNzaW9uczogeiA9ICh4ID0geSksIGZ1bmMoeCA9IHkpXHJcbiAgICBjb25zdCBhc3NpZ25JbkV4cHJSZWdleCA9IC9bXj0hPD5dPVxccypcXChbXildKlxcYlxcdytcXHMqPVxccypbXj1dLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgZm9yIGFzc2lnbm1lbnQgaW4gY29uZGl0aW9uc1xyXG4gICAgICBpZiAoYXNzaWduSW5Db25kaXRpb25SZWdleC50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgLy8gRXhjbHVkZSBjb21wYXJpc29uIG9wZXJhdG9ycyAoPT0sICE9LCA8PSwgPj0pXHJcbiAgICAgICAgaWYgKCFsaW5lLmluY2x1ZGVzKCc9PScpIHx8IGxpbmUuaW5kZXhPZignPScpIDwgbGluZS5pbmRleE9mKCc9PScpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgJ0Fzc2lnbm1lbnQgb3BlcmF0b3IgdXNlZCBpbiBzdWItZXhwcmVzc2lvbiAoY29uZGl0aW9uKScsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgZm9yIGFzc2lnbm1lbnQgaW4gZXhwcmVzc2lvbnNcclxuICAgICAgaWYgKGFzc2lnbkluRXhwclJlZ2V4LnRlc3QobGluZSkpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnQXNzaWdubWVudCBvcGVyYXRvciB1c2VkIGluIHN1Yi1leHByZXNzaW9uJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19