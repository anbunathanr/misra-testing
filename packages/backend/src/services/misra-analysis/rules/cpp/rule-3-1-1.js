"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_1_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-1-1
 * It shall be possible to include any header file in multiple translation units
 * without violating the one definition rule.
 * Detects multiple declarations on one line (e.g., `int a, b;`).
 */
class Rule_CPP_3_1_1 {
    id = 'MISRA-CPP-3.1.1';
    description = 'Multiple declarations on one line shall not be used';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect lines like: int a, b; or int* p, q; or int x = 1, y = 2;
        // Look for comma-separated declarations ending with semicolon
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Skip function parameters and for-loop headers
            if (line.includes('for') && line.includes('('))
                continue;
            if (line.includes('(') && line.includes(')') && !line.includes(';'))
                continue;
            // Check if line contains comma and ends with semicolon (declaration)
            if (line.includes(',') && line.endsWith(';')) {
                // Check if it looks like a variable declaration
                const declRegex = /^\s*(?:const\s+|static\s+|volatile\s+|extern\s+|mutable\s+|auto\s+)*(?:[a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+[a-zA-Z_]\w*\s*(?:=\s*[^,;]+)?\s*,/;
                if (declRegex.test(line)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Multiple declarations on one line', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_1_1 = Rule_CPP_3_1_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTEtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy0xLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7OztHQUtHO0FBQ0gsTUFBYSxjQUFjO0lBQ3pCLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQztJQUN2QixXQUFXLEdBQUcscURBQXFELENBQUM7SUFDcEUsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixrRUFBa0U7UUFDbEUsOERBQThEO1FBQzlELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBQ3JFLGdEQUFnRDtZQUNoRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7Z0JBQUUsU0FBUztZQUN6RCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO2dCQUFFLFNBQVM7WUFFOUUscUVBQXFFO1lBQ3JFLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLGdEQUFnRDtnQkFDaEQsTUFBTSxTQUFTLEdBQUcsMklBQTJJLENBQUM7Z0JBQzlKLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN6QixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsbUNBQW1DLEVBQ25DLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBeENELHdDQXdDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDMtMS0xXHJcbiAqIEl0IHNoYWxsIGJlIHBvc3NpYmxlIHRvIGluY2x1ZGUgYW55IGhlYWRlciBmaWxlIGluIG11bHRpcGxlIHRyYW5zbGF0aW9uIHVuaXRzXHJcbiAqIHdpdGhvdXQgdmlvbGF0aW5nIHRoZSBvbmUgZGVmaW5pdGlvbiBydWxlLlxyXG4gKiBEZXRlY3RzIG11bHRpcGxlIGRlY2xhcmF0aW9ucyBvbiBvbmUgbGluZSAoZS5nLiwgYGludCBhLCBiO2ApLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzNfMV8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtMy4xLjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ011bHRpcGxlIGRlY2xhcmF0aW9ucyBvbiBvbmUgbGluZSBzaGFsbCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBEZXRlY3QgbGluZXMgbGlrZTogaW50IGEsIGI7IG9yIGludCogcCwgcTsgb3IgaW50IHggPSAxLCB5ID0gMjtcclxuICAgIC8vIExvb2sgZm9yIGNvbW1hLXNlcGFyYXRlZCBkZWNsYXJhdGlvbnMgZW5kaW5nIHdpdGggc2VtaWNvbG9uXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG4gICAgICAvLyBTa2lwIGZ1bmN0aW9uIHBhcmFtZXRlcnMgYW5kIGZvci1sb29wIGhlYWRlcnNcclxuICAgICAgaWYgKGxpbmUuaW5jbHVkZXMoJ2ZvcicpICYmIGxpbmUuaW5jbHVkZXMoJygnKSkgY29udGludWU7XHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCcoJykgJiYgbGluZS5pbmNsdWRlcygnKScpICYmICFsaW5lLmluY2x1ZGVzKCc7JykpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgbGluZSBjb250YWlucyBjb21tYSBhbmQgZW5kcyB3aXRoIHNlbWljb2xvbiAoZGVjbGFyYXRpb24pXHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCcsJykgJiYgbGluZS5lbmRzV2l0aCgnOycpKSB7XHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQgbG9va3MgbGlrZSBhIHZhcmlhYmxlIGRlY2xhcmF0aW9uXHJcbiAgICAgICAgY29uc3QgZGVjbFJlZ2V4ID0gL15cXHMqKD86Y29uc3RcXHMrfHN0YXRpY1xccyt8dm9sYXRpbGVcXHMrfGV4dGVyblxccyt8bXV0YWJsZVxccyt8YXV0b1xccyspKig/OlthLXpBLVpfXVtcXHc6XSooPzpcXHMqWyomXSspPylcXHMrW2EtekEtWl9dXFx3KlxccyooPzo9XFxzKlteLDtdKyk/XFxzKiwvO1xyXG4gICAgICAgIGlmIChkZWNsUmVnZXgudGVzdChsaW5lKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdNdWx0aXBsZSBkZWNsYXJhdGlvbnMgb24gb25lIGxpbmUnLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19