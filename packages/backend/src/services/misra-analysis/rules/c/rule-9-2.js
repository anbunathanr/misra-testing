"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_9_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 9.2
 * The initializer for an aggregate or union shall be enclosed in braces.
 */
class Rule_C_9_2 {
    id = 'MISRA-C-9.2';
    description = 'The initializer for an aggregate or union shall be enclosed in braces';
    severity = 'required';
    category = 'Initialization';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for array initialization without braces
            const arrayMatch = line.match(/\w+\s+\w+\[\d*\]\s*=\s*([^{][^;]*)/);
            if (arrayMatch && !arrayMatch[1].includes('{')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Array initializer should be enclosed in braces', line));
            }
            // Check for struct initialization without braces
            const structMatch = line.match(/struct\s+\w+\s+\w+\s*=\s*([^{][^;]*)/);
            if (structMatch && !structMatch[1].includes('{')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Struct initializer should be enclosed in braces', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_9_2 = Rule_C_9_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS05LTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTktMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLHVFQUF1RSxDQUFDO0lBQ3RGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztJQUM1QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxnREFBZ0Q7WUFDaEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQ3BFLElBQUksVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMvQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsZ0RBQWdELEVBQ2hELElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1lBRUQsaURBQWlEO1lBQ2pELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQztZQUN2RSxJQUFJLFdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDakQsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGlEQUFpRCxFQUNqRCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE1Q0QsZ0NBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDkuMlxyXG4gKiBUaGUgaW5pdGlhbGl6ZXIgZm9yIGFuIGFnZ3JlZ2F0ZSBvciB1bmlvbiBzaGFsbCBiZSBlbmNsb3NlZCBpbiBicmFjZXMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzlfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy05LjInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBpbml0aWFsaXplciBmb3IgYW4gYWdncmVnYXRlIG9yIHVuaW9uIHNoYWxsIGJlIGVuY2xvc2VkIGluIGJyYWNlcyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0luaXRpYWxpemF0aW9uJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3IgYXJyYXkgaW5pdGlhbGl6YXRpb24gd2l0aG91dCBicmFjZXNcclxuICAgICAgY29uc3QgYXJyYXlNYXRjaCA9IGxpbmUubWF0Y2goL1xcdytcXHMrXFx3K1xcW1xcZCpcXF1cXHMqPVxccyooW157XVteO10qKS8pO1xyXG4gICAgICBpZiAoYXJyYXlNYXRjaCAmJiAhYXJyYXlNYXRjaFsxXS5pbmNsdWRlcygneycpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0FycmF5IGluaXRpYWxpemVyIHNob3VsZCBiZSBlbmNsb3NlZCBpbiBicmFjZXMnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHN0cnVjdCBpbml0aWFsaXphdGlvbiB3aXRob3V0IGJyYWNlc1xyXG4gICAgICBjb25zdCBzdHJ1Y3RNYXRjaCA9IGxpbmUubWF0Y2goL3N0cnVjdFxccytcXHcrXFxzK1xcdytcXHMqPVxccyooW157XVteO10qKS8pO1xyXG4gICAgICBpZiAoc3RydWN0TWF0Y2ggJiYgIXN0cnVjdE1hdGNoWzFdLmluY2x1ZGVzKCd7JykpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnU3RydWN0IGluaXRpYWxpemVyIHNob3VsZCBiZSBlbmNsb3NlZCBpbiBicmFjZXMnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=