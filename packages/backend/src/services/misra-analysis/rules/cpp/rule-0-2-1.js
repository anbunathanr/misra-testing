"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_2_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 0-2-1
 * An object shall not be assigned to an overlapping object.
 * Detects potential aliasing issues in assignments.
 */
class Rule_CPP_0_2_1 {
    id = 'MISRA-CPP-0.2.1';
    description = 'An object shall not be assigned to an overlapping object';
    severity = 'required';
    category = 'Memory';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect self-assignment: x = x;
        const selfAssignRegex = /^\s*([a-zA-Z_]\w*)\s*=\s*\1\s*;/;
        // Detect array element self-copy: arr[i] = arr[i];
        const arraySelfCopyRegex = /^\s*([a-zA-Z_]\w*)\[([^\]]+)\]\s*=\s*\1\[\2\]/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            if (selfAssignRegex.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Self-assignment detected', line));
            }
            if (arraySelfCopyRegex.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Array element self-copy detected', line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_0_2_1 = Rule_CPP_0_2_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTItMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0yLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRywwREFBMEQsQ0FBQztJQUN6RSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsUUFBUSxDQUFDO0lBQ3BCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLGlDQUFpQztRQUNqQyxNQUFNLGVBQWUsR0FBRyxpQ0FBaUMsQ0FBQztRQUUxRCxtREFBbUQ7UUFDbkQsTUFBTSxrQkFBa0IsR0FBRywrQ0FBK0MsQ0FBQztRQUUzRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDBCQUEwQixFQUMxQixJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztZQUVELElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ2xDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxrQ0FBa0MsRUFDbEMsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBaERELHdDQWdEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDAtMi0xXHJcbiAqIEFuIG9iamVjdCBzaGFsbCBub3QgYmUgYXNzaWduZWQgdG8gYW4gb3ZlcmxhcHBpbmcgb2JqZWN0LlxyXG4gKiBEZXRlY3RzIHBvdGVudGlhbCBhbGlhc2luZyBpc3N1ZXMgaW4gYXNzaWdubWVudHMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMF8yXzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0wLjIuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQW4gb2JqZWN0IHNoYWxsIG5vdCBiZSBhc3NpZ25lZCB0byBhbiBvdmVybGFwcGluZyBvYmplY3QnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdNZW1vcnknO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRGV0ZWN0IHNlbGYtYXNzaWdubWVudDogeCA9IHg7XHJcbiAgICBjb25zdCBzZWxmQXNzaWduUmVnZXggPSAvXlxccyooW2EtekEtWl9dXFx3KilcXHMqPVxccypcXDFcXHMqOy87XHJcbiAgICBcclxuICAgIC8vIERldGVjdCBhcnJheSBlbGVtZW50IHNlbGYtY29weTogYXJyW2ldID0gYXJyW2ldO1xyXG4gICAgY29uc3QgYXJyYXlTZWxmQ29weVJlZ2V4ID0gL15cXHMqKFthLXpBLVpfXVxcdyopXFxbKFteXFxdXSspXFxdXFxzKj1cXHMqXFwxXFxbXFwyXFxdLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgaWYgKHNlbGZBc3NpZ25SZWdleC50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ1NlbGYtYXNzaWdubWVudCBkZXRlY3RlZCcsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiAoYXJyYXlTZWxmQ29weVJlZ2V4LnRlc3QobGluZSkpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnQXJyYXkgZWxlbWVudCBzZWxmLWNvcHkgZGV0ZWN0ZWQnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=