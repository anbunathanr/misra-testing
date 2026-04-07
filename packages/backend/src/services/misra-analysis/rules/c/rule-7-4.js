"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_7_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 7.4
 * A string literal shall not be assigned to an object unless the object's type is pointer to const-qualified char.
 */
class Rule_C_7_4 {
    id = 'MISRA-C-7.4';
    description = 'A string literal shall not be assigned to an object unless the object\'s type is pointer to const-qualified char';
    severity = 'required';
    category = 'Literals';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for char* (non-const) assigned string literal
            const nonConstMatch = line.match(/char\s*\*\s*\w+\s*=\s*"[^"]*"/);
            if (nonConstMatch && !line.includes('const')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'String literal assigned to non-const char pointer', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_7_4 = Rule_C_7_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS03LTQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTctNC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLGtIQUFrSCxDQUFDO0lBQ2pJLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxVQUFVLENBQUM7SUFDdEIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsc0RBQXNEO1lBQ3RELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztZQUNsRSxJQUFJLGFBQWEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELG1EQUFtRCxFQUNuRCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE5QkQsZ0NBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDcuNFxyXG4gKiBBIHN0cmluZyBsaXRlcmFsIHNoYWxsIG5vdCBiZSBhc3NpZ25lZCB0byBhbiBvYmplY3QgdW5sZXNzIHRoZSBvYmplY3QncyB0eXBlIGlzIHBvaW50ZXIgdG8gY29uc3QtcXVhbGlmaWVkIGNoYXIuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzdfNCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy03LjQnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0Egc3RyaW5nIGxpdGVyYWwgc2hhbGwgbm90IGJlIGFzc2lnbmVkIHRvIGFuIG9iamVjdCB1bmxlc3MgdGhlIG9iamVjdFxcJ3MgdHlwZSBpcyBwb2ludGVyIHRvIGNvbnN0LXF1YWxpZmllZCBjaGFyJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnTGl0ZXJhbHMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBjaGFyKiAobm9uLWNvbnN0KSBhc3NpZ25lZCBzdHJpbmcgbGl0ZXJhbFxyXG4gICAgICBjb25zdCBub25Db25zdE1hdGNoID0gbGluZS5tYXRjaCgvY2hhclxccypcXCpcXHMqXFx3K1xccyo9XFxzKlwiW15cIl0qXCIvKTtcclxuICAgICAgaWYgKG5vbkNvbnN0TWF0Y2ggJiYgIWxpbmUuaW5jbHVkZXMoJ2NvbnN0JykpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnU3RyaW5nIGxpdGVyYWwgYXNzaWduZWQgdG8gbm9uLWNvbnN0IGNoYXIgcG9pbnRlcicsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==