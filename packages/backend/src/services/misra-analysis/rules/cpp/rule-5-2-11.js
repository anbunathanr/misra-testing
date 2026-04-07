"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_2_11 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-2-11
 * The comma operator, && operator and the || operator shall not be overloaded.
 */
class Rule_CPP_5_2_11 {
    id = 'MISRA-CPP-5.2.11';
    description = 'Comma, &&, and || operators shall not be overloaded';
    severity = 'required';
    category = 'Operators';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // operator overloading for comma, &&, ||
            if (/operator\s*(,|&&|\|\|)/.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Overloading of comma, &&, or || operator detected', line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_2_11 = Rule_CPP_5_2_11;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTItMTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTUtMi0xMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxlQUFlO0lBQzFCLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQztJQUN4QixXQUFXLEdBQUcscURBQXFELENBQUM7SUFDcEUsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFdBQVcsQ0FBQztJQUN2QixRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSx5Q0FBeUM7WUFDekMsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELG1EQUFtRCxFQUNuRCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUEvQkQsMENBK0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNS0yLTExXHJcbiAqIFRoZSBjb21tYSBvcGVyYXRvciwgJiYgb3BlcmF0b3IgYW5kIHRoZSB8fCBvcGVyYXRvciBzaGFsbCBub3QgYmUgb3ZlcmxvYWRlZC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF81XzJfMTEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC01LjIuMTEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0NvbW1hLCAmJiwgYW5kIHx8IG9wZXJhdG9ycyBzaGFsbCBub3QgYmUgb3ZlcmxvYWRlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ09wZXJhdG9ycyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgLy8gb3BlcmF0b3Igb3ZlcmxvYWRpbmcgZm9yIGNvbW1hLCAmJiwgfHxcclxuICAgICAgaWYgKC9vcGVyYXRvclxccyooLHwmJnxcXHxcXHwpLy50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ092ZXJsb2FkaW5nIG9mIGNvbW1hLCAmJiwgb3IgfHwgb3BlcmF0b3IgZGV0ZWN0ZWQnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=