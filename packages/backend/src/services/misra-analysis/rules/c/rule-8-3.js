"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.3
 * All declarations of an object or function shall use the same names and type qualifiers.
 */
class Rule_C_8_3 {
    id = 'MISRA-C-8.3';
    description = 'All declarations of an object or function shall use the same names and type qualifiers';
    severity = 'required';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const declarations = new Map();
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Match function declarations
            const funcMatch = line.match(/((?:const\s+|volatile\s+)*\w+\s+\*?\s*)(\w+)\s*\(/);
            if (funcMatch) {
                const type = funcMatch[1].trim();
                const name = funcMatch[2];
                if (declarations.has(name)) {
                    if (declarations.get(name) !== type) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Declaration of '${name}' has different type qualifiers`, line));
                    }
                }
                else {
                    declarations.set(name, type);
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_8_3 = Rule_C_8_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTgtMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLHdGQUF3RixDQUFDO0lBQ3ZHLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRS9DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsOEJBQThCO1lBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsbURBQW1ELENBQUMsQ0FBQztZQUNsRixJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNkLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDM0IsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO3dCQUNwQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsbUJBQW1CLElBQUksaUNBQWlDLEVBQ3hELElBQUksQ0FDTCxDQUNGLENBQUM7b0JBQ0osQ0FBQztnQkFDSCxDQUFDO3FCQUFNLENBQUM7b0JBQ04sWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQy9CLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXhDRCxnQ0F3Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgOC4zXHJcbiAqIEFsbCBkZWNsYXJhdGlvbnMgb2YgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uIHNoYWxsIHVzZSB0aGUgc2FtZSBuYW1lcyBhbmQgdHlwZSBxdWFsaWZpZXJzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ184XzMgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtOC4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdBbGwgZGVjbGFyYXRpb25zIG9mIGFuIG9iamVjdCBvciBmdW5jdGlvbiBzaGFsbCB1c2UgdGhlIHNhbWUgbmFtZXMgYW5kIHR5cGUgcXVhbGlmaWVycyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgZGVjbGFyYXRpb25zID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIE1hdGNoIGZ1bmN0aW9uIGRlY2xhcmF0aW9uc1xyXG4gICAgICBjb25zdCBmdW5jTWF0Y2ggPSBsaW5lLm1hdGNoKC8oKD86Y29uc3RcXHMrfHZvbGF0aWxlXFxzKykqXFx3K1xccytcXCo/XFxzKikoXFx3KylcXHMqXFwoLyk7XHJcbiAgICAgIGlmIChmdW5jTWF0Y2gpIHtcclxuICAgICAgICBjb25zdCB0eXBlID0gZnVuY01hdGNoWzFdLnRyaW0oKTtcclxuICAgICAgICBjb25zdCBuYW1lID0gZnVuY01hdGNoWzJdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChkZWNsYXJhdGlvbnMuaGFzKG5hbWUpKSB7XHJcbiAgICAgICAgICBpZiAoZGVjbGFyYXRpb25zLmdldChuYW1lKSAhPT0gdHlwZSkge1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAgIGBEZWNsYXJhdGlvbiBvZiAnJHtuYW1lfScgaGFzIGRpZmZlcmVudCB0eXBlIHF1YWxpZmllcnNgLFxyXG4gICAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZGVjbGFyYXRpb25zLnNldChuYW1lLCB0eXBlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19