"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_0_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-0-2
 * Limited dependence should be placed on C++ operator precedence rules in expressions.
 */
class Rule_CPP_5_0_2 {
    id = 'MISRA-CPP-5.0.2';
    description = 'Use parentheses to clarify operator precedence';
    severity = 'advisory';
    category = 'Expressions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Mixed operators without parentheses: a + b * c, a && b || c
            if (/[+\-]\s*\w+\s*[*\/]/.test(line) && !/\(.*[*\/].*\)/.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Mixed arithmetic operators without parentheses', line));
            }
            if (/&&.*\|\||&&.*\|\|/.test(line) && !/\(.*&&.*\)|\(.*\|\|.*\)/.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Mixed logical operators without parentheses', line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_0_2 = Rule_CPP_5_0_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTAtMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNS0wLTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLGdEQUFnRCxDQUFDO0lBQy9ELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsOERBQThEO1lBQzlELElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsZ0RBQWdELEVBQ2hELElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1lBRUQsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDNUUsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDZDQUE2QyxFQUM3QyxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUEzQ0Qsd0NBMkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNS0wLTJcclxuICogTGltaXRlZCBkZXBlbmRlbmNlIHNob3VsZCBiZSBwbGFjZWQgb24gQysrIG9wZXJhdG9yIHByZWNlZGVuY2UgcnVsZXMgaW4gZXhwcmVzc2lvbnMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfNV8wXzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC01LjAuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnVXNlIHBhcmVudGhlc2VzIHRvIGNsYXJpZnkgb3BlcmF0b3IgcHJlY2VkZW5jZSc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0V4cHJlc3Npb25zJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBNaXhlZCBvcGVyYXRvcnMgd2l0aG91dCBwYXJlbnRoZXNlczogYSArIGIgKiBjLCBhICYmIGIgfHwgY1xyXG4gICAgICBpZiAoL1srXFwtXVxccypcXHcrXFxzKlsqXFwvXS8udGVzdChsaW5lKSAmJiAhL1xcKC4qWypcXC9dLipcXCkvLnRlc3QobGluZSkpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnTWl4ZWQgYXJpdGhtZXRpYyBvcGVyYXRvcnMgd2l0aG91dCBwYXJlbnRoZXNlcycsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoLyYmLipcXHxcXHx8JiYuKlxcfFxcfC8udGVzdChsaW5lKSAmJiAhL1xcKC4qJiYuKlxcKXxcXCguKlxcfFxcfC4qXFwpLy50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ01peGVkIGxvZ2ljYWwgb3BlcmF0b3JzIHdpdGhvdXQgcGFyZW50aGVzZXMnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=