"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_4_5_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 4-5-2
 * Expressions with type enum shall not be used as operands to built-in operators other than the subscript operator [ ], the assignment operator =, the equality operators == and !=, the unary & operator, and the relational operators <, <=, >, >=.
 * Prevents misuse of enum expressions.
 */
class Rule_CPP_4_5_2 {
    id = 'MISRA-CPP-4.5.2';
    description = 'Enum expressions shall not be used with arithmetic operators';
    severity = 'required';
    category = 'Expressions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track enum declarations
        const enums = new Set();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Track enum declarations
            const enumMatch = line.match(/\benum\s+(\w+)/);
            if (enumMatch) {
                enums.add(enumMatch[1]);
            }
            // Check for enum used with arithmetic operators
            for (const enumName of enums) {
                if (line.includes(enumName)) {
                    if (/[+\-*\/%]|<<|>>|\^|\||&(?!&)/.test(line) && !/==|!=|<=|>=|<|>/.test(line)) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Enum '${enumName}' used with arithmetic operator`, line));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_4_5_2 = Rule_CPP_4_5_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS00LTUtMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNC01LTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw4REFBOEQsQ0FBQztJQUM3RSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLDBCQUEwQjtRQUMxQixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBRWhDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRXJFLDBCQUEwQjtZQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDL0MsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZCxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLENBQUM7WUFFRCxnREFBZ0Q7WUFDaEQsS0FBSyxNQUFNLFFBQVEsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQzVCLElBQUksOEJBQThCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQy9FLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxTQUFTLFFBQVEsaUNBQWlDLEVBQ2xELElBQUksQ0FDTCxDQUNGLENBQUM7b0JBQ0osQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE1Q0Qsd0NBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNC01LTJcclxuICogRXhwcmVzc2lvbnMgd2l0aCB0eXBlIGVudW0gc2hhbGwgbm90IGJlIHVzZWQgYXMgb3BlcmFuZHMgdG8gYnVpbHQtaW4gb3BlcmF0b3JzIG90aGVyIHRoYW4gdGhlIHN1YnNjcmlwdCBvcGVyYXRvciBbIF0sIHRoZSBhc3NpZ25tZW50IG9wZXJhdG9yID0sIHRoZSBlcXVhbGl0eSBvcGVyYXRvcnMgPT0gYW5kICE9LCB0aGUgdW5hcnkgJiBvcGVyYXRvciwgYW5kIHRoZSByZWxhdGlvbmFsIG9wZXJhdG9ycyA8LCA8PSwgPiwgPj0uXHJcbiAqIFByZXZlbnRzIG1pc3VzZSBvZiBlbnVtIGV4cHJlc3Npb25zLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzRfNV8yIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtNC41LjInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0VudW0gZXhwcmVzc2lvbnMgc2hhbGwgbm90IGJlIHVzZWQgd2l0aCBhcml0aG1ldGljIG9wZXJhdG9ycyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0V4cHJlc3Npb25zJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIFRyYWNrIGVudW0gZGVjbGFyYXRpb25zXHJcbiAgICBjb25zdCBlbnVtcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBUcmFjayBlbnVtIGRlY2xhcmF0aW9uc1xyXG4gICAgICBjb25zdCBlbnVtTWF0Y2ggPSBsaW5lLm1hdGNoKC9cXGJlbnVtXFxzKyhcXHcrKS8pO1xyXG4gICAgICBpZiAoZW51bU1hdGNoKSB7XHJcbiAgICAgICAgZW51bXMuYWRkKGVudW1NYXRjaFsxXSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIGZvciBlbnVtIHVzZWQgd2l0aCBhcml0aG1ldGljIG9wZXJhdG9yc1xyXG4gICAgICBmb3IgKGNvbnN0IGVudW1OYW1lIG9mIGVudW1zKSB7XHJcbiAgICAgICAgaWYgKGxpbmUuaW5jbHVkZXMoZW51bU5hbWUpKSB7XHJcbiAgICAgICAgICBpZiAoL1srXFwtKlxcLyVdfDw8fD4+fFxcXnxcXHx8Jig/ISYpLy50ZXN0KGxpbmUpICYmICEvPT18IT18PD18Pj18PHw+Ly50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgYEVudW0gJyR7ZW51bU5hbWV9JyB1c2VkIHdpdGggYXJpdGhtZXRpYyBvcGVyYXRvcmAsXHJcbiAgICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=