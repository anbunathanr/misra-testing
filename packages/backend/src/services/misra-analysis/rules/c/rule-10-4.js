"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_10_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 10.4
 * Both operands of an operator in which the usual arithmetic conversions are performed shall have the same essential type category.
 */
class Rule_C_10_4 {
    id = 'MISRA-C-10.4';
    description = 'Both operands of an operator in which the usual arithmetic conversions are performed shall have the same essential type category';
    severity = 'required';
    category = 'Conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for mixed signed/unsigned operations
            const mixedMatch = line.match(/(unsigned\s+\w+|signed\s+\w+)\s+\w+\s*=\s*\w+\s*[+\-*\/]\s*\w+/);
            if (mixedMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Mixed type operands in arithmetic operation', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_10_4 = Rule_C_10_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMC00LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMC00LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsa0lBQWtJLENBQUM7SUFDakosUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyw2Q0FBNkM7WUFDN0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnRUFBZ0UsQ0FBQyxDQUFDO1lBQ2hHLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2YsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDZDQUE2QyxFQUM3QyxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE5QkQsa0NBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDEwLjRcclxuICogQm90aCBvcGVyYW5kcyBvZiBhbiBvcGVyYXRvciBpbiB3aGljaCB0aGUgdXN1YWwgYXJpdGhtZXRpYyBjb252ZXJzaW9ucyBhcmUgcGVyZm9ybWVkIHNoYWxsIGhhdmUgdGhlIHNhbWUgZXNzZW50aWFsIHR5cGUgY2F0ZWdvcnkuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzEwXzQgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTAuNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQm90aCBvcGVyYW5kcyBvZiBhbiBvcGVyYXRvciBpbiB3aGljaCB0aGUgdXN1YWwgYXJpdGhtZXRpYyBjb252ZXJzaW9ucyBhcmUgcGVyZm9ybWVkIHNoYWxsIGhhdmUgdGhlIHNhbWUgZXNzZW50aWFsIHR5cGUgY2F0ZWdvcnknO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb252ZXJzaW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIG1peGVkIHNpZ25lZC91bnNpZ25lZCBvcGVyYXRpb25zXHJcbiAgICAgIGNvbnN0IG1peGVkTWF0Y2ggPSBsaW5lLm1hdGNoKC8odW5zaWduZWRcXHMrXFx3K3xzaWduZWRcXHMrXFx3KylcXHMrXFx3K1xccyo9XFxzKlxcdytcXHMqWytcXC0qXFwvXVxccypcXHcrLyk7XHJcbiAgICAgIGlmIChtaXhlZE1hdGNoKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ01peGVkIHR5cGUgb3BlcmFuZHMgaW4gYXJpdGhtZXRpYyBvcGVyYXRpb24nLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=