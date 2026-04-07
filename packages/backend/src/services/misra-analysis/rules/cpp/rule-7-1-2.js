"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_7_1_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 7-1-2
 * A pointer or reference parameter in a function shall be declared as pointer to const or reference to const if the corresponding object is not modified.
 */
class Rule_CPP_7_1_2 {
    id = 'MISRA-CPP-7.1.2';
    description = 'A pointer or reference parameter in a function shall be declared as pointer to const or reference to const if the corresponding object is not modified';
    severity = 'required';
    category = 'Functions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip lines that already have const
            if (line.includes('const')) {
                continue;
            }
            // Check for function parameters with pointers/references without const
            const funcParamRegex = /\b([a-zA-Z_]\w*)\s*\(\s*([^)]+)\s*\)/;
            const match = line.match(funcParamRegex);
            if (match) {
                const params = match[2];
                // Check for pointer or reference parameters
                const ptrRefRegex = /([a-zA-Z_]\w*)\s*[*&]\s*([a-zA-Z_]\w*)/g;
                let paramMatch;
                while ((paramMatch = ptrRefRegex.exec(params)) !== null) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Parameter '${paramMatch[2]}' should be declared as pointer/reference to const if not modified`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_7_1_2 = Rule_CPP_7_1_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS03LTEtMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNy0xLTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLHdKQUF3SixDQUFDO0lBQ3ZLLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxXQUFXLENBQUM7SUFDdkIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IscUNBQXFDO1lBQ3JDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUMzQixTQUFTO1lBQ1gsQ0FBQztZQUVELHVFQUF1RTtZQUN2RSxNQUFNLGNBQWMsR0FBRyxzQ0FBc0MsQ0FBQztZQUM5RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRXpDLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4Qiw0Q0FBNEM7Z0JBQzVDLE1BQU0sV0FBVyxHQUFHLHlDQUF5QyxDQUFDO2dCQUM5RCxJQUFJLFVBQVUsQ0FBQztnQkFFZixPQUFPLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDeEQsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGNBQWMsVUFBVSxDQUFDLENBQUMsQ0FBQyxvRUFBb0UsRUFDL0YsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE3Q0Qsd0NBNkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNy0xLTJcclxuICogQSBwb2ludGVyIG9yIHJlZmVyZW5jZSBwYXJhbWV0ZXIgaW4gYSBmdW5jdGlvbiBzaGFsbCBiZSBkZWNsYXJlZCBhcyBwb2ludGVyIHRvIGNvbnN0IG9yIHJlZmVyZW5jZSB0byBjb25zdCBpZiB0aGUgY29ycmVzcG9uZGluZyBvYmplY3QgaXMgbm90IG1vZGlmaWVkLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzdfMV8yIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtNy4xLjInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgcG9pbnRlciBvciByZWZlcmVuY2UgcGFyYW1ldGVyIGluIGEgZnVuY3Rpb24gc2hhbGwgYmUgZGVjbGFyZWQgYXMgcG9pbnRlciB0byBjb25zdCBvciByZWZlcmVuY2UgdG8gY29uc3QgaWYgdGhlIGNvcnJlc3BvbmRpbmcgb2JqZWN0IGlzIG5vdCBtb2RpZmllZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0Z1bmN0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBTa2lwIGxpbmVzIHRoYXQgYWxyZWFkeSBoYXZlIGNvbnN0XHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCdjb25zdCcpKSB7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBmdW5jdGlvbiBwYXJhbWV0ZXJzIHdpdGggcG9pbnRlcnMvcmVmZXJlbmNlcyB3aXRob3V0IGNvbnN0XHJcbiAgICAgIGNvbnN0IGZ1bmNQYXJhbVJlZ2V4ID0gL1xcYihbYS16QS1aX11cXHcqKVxccypcXChcXHMqKFteKV0rKVxccypcXCkvO1xyXG4gICAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goZnVuY1BhcmFtUmVnZXgpO1xyXG4gICAgICBcclxuICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgY29uc3QgcGFyYW1zID0gbWF0Y2hbMl07XHJcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHBvaW50ZXIgb3IgcmVmZXJlbmNlIHBhcmFtZXRlcnNcclxuICAgICAgICBjb25zdCBwdHJSZWZSZWdleCA9IC8oW2EtekEtWl9dXFx3KilcXHMqWyomXVxccyooW2EtekEtWl9dXFx3KikvZztcclxuICAgICAgICBsZXQgcGFyYW1NYXRjaDtcclxuICAgICAgICBcclxuICAgICAgICB3aGlsZSAoKHBhcmFtTWF0Y2ggPSBwdHJSZWZSZWdleC5leGVjKHBhcmFtcykpICE9PSBudWxsKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYFBhcmFtZXRlciAnJHtwYXJhbU1hdGNoWzJdfScgc2hvdWxkIGJlIGRlY2xhcmVkIGFzIHBvaW50ZXIvcmVmZXJlbmNlIHRvIGNvbnN0IGlmIG5vdCBtb2RpZmllZGAsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=