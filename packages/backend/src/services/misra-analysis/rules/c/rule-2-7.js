"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_2_7 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 2.7
 * There should be no unused parameters in functions.
 */
class Rule_C_2_7 {
    id = 'MISRA-C-2.7';
    description = 'There should be no unused parameters in functions';
    severity = 'advisory';
    category = 'Unused code';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (const func of ast.functions) {
            if (!func.params || func.params.length === 0)
                continue;
            for (const param of func.params) {
                let used = false;
                // Check if parameter is used anywhere in the source
                const funcLine = func.line;
                for (let i = funcLine; i < Math.min(funcLine + 50, ast.lines.length); i++) {
                    const line = ast.lines[i - 1];
                    if (line && line.includes(param)) {
                        used = true;
                        break;
                    }
                }
                if (!used) {
                    violations.push((0, rule_engine_1.createViolation)(this, func.line, 0, `Unused parameter '${param}' in function '${func.name}'`, ast.lines[func.line - 1] || ''));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_2_7 = Rule_C_2_7;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTItNy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLG1EQUFtRCxDQUFDO0lBQ2xFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUM7Z0JBQUUsU0FBUztZQUV2RCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDO2dCQUVqQixvREFBb0Q7Z0JBQ3BELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUMxRSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDOUIsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUNqQyxJQUFJLEdBQUcsSUFBSSxDQUFDO3dCQUNaLE1BQU07b0JBQ1IsQ0FBQztnQkFDSCxDQUFDO2dCQUVELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDVixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osSUFBSSxDQUFDLElBQUksRUFDVCxDQUFDLEVBQ0QscUJBQXFCLEtBQUssa0JBQWtCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFDeEQsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FDL0IsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTFDRCxnQ0EwQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMi43XHJcbiAqIFRoZXJlIHNob3VsZCBiZSBubyB1bnVzZWQgcGFyYW1ldGVycyBpbiBmdW5jdGlvbnMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzJfNyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yLjcnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZXJlIHNob3VsZCBiZSBubyB1bnVzZWQgcGFyYW1ldGVycyBpbiBmdW5jdGlvbnMnO1xyXG4gIHNldmVyaXR5ID0gJ2Fkdmlzb3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdVbnVzZWQgY29kZSc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAoY29uc3QgZnVuYyBvZiBhc3QuZnVuY3Rpb25zKSB7XHJcbiAgICAgIGlmICghZnVuYy5wYXJhbXMgfHwgZnVuYy5wYXJhbXMubGVuZ3RoID09PSAwKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgZnVuYy5wYXJhbXMpIHtcclxuICAgICAgICBsZXQgdXNlZCA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGlmIHBhcmFtZXRlciBpcyB1c2VkIGFueXdoZXJlIGluIHRoZSBzb3VyY2VcclxuICAgICAgICBjb25zdCBmdW5jTGluZSA9IGZ1bmMubGluZTtcclxuICAgICAgICBmb3IgKGxldCBpID0gZnVuY0xpbmU7IGkgPCBNYXRoLm1pbihmdW5jTGluZSArIDUwLCBhc3QubGluZXMubGVuZ3RoKTsgaSsrKSB7XHJcbiAgICAgICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2kgLSAxXTtcclxuICAgICAgICAgIGlmIChsaW5lICYmIGxpbmUuaW5jbHVkZXMocGFyYW0pKSB7XHJcbiAgICAgICAgICAgIHVzZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdXNlZCkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBmdW5jLmxpbmUsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICBgVW51c2VkIHBhcmFtZXRlciAnJHtwYXJhbX0nIGluIGZ1bmN0aW9uICcke2Z1bmMubmFtZX0nYCxcclxuICAgICAgICAgICAgICBhc3QubGluZXNbZnVuYy5saW5lIC0gMV0gfHwgJydcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19