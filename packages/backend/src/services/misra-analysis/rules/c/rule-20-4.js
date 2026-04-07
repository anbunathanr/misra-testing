"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_20_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 20.4
 * A macro shall not be defined with the same name as a keyword.
 * Also: #undef should not be used (common interpretation).
 */
class Rule_C_20_4 {
    id = 'MISRA-C-20.4';
    description = '#undef should not be used';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        const undefRegex = /^\s*#\s*undef\s+(\w+)/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(undefRegex);
            if (match) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `#undef '${match[1]}' should not be used`, line.trim()));
            }
        }
        return violations;
    }
}
exports.Rule_C_20_4 = Rule_C_20_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yMC00LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0yMC00LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLDJCQUEyQixDQUFDO0lBQzFDLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxlQUFlLENBQUM7SUFDM0IsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsTUFBTSxVQUFVLEdBQUcsdUJBQXVCLENBQUM7UUFFM0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNyQyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNWLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxXQUFXLEtBQUssQ0FBQyxDQUFDLENBQUMsc0JBQXNCLEVBQ3pDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDWixDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQS9CRCxrQ0ErQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMjAuNFxyXG4gKiBBIG1hY3JvIHNoYWxsIG5vdCBiZSBkZWZpbmVkIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBhIGtleXdvcmQuXHJcbiAqIEFsc286ICN1bmRlZiBzaG91bGQgbm90IGJlIHVzZWQgKGNvbW1vbiBpbnRlcnByZXRhdGlvbikuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIwXzQgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjAuNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnI3VuZGVmIHNob3VsZCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1ByZXByb2Nlc3NpbmcnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIGNvbnN0IHVuZGVmUmVnZXggPSAvXlxccyojXFxzKnVuZGVmXFxzKyhcXHcrKS87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XHJcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCh1bmRlZlJlZ2V4KTtcclxuICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgYCN1bmRlZiAnJHttYXRjaFsxXX0nIHNob3VsZCBub3QgYmUgdXNlZGAsXHJcbiAgICAgICAgICAgIGxpbmUudHJpbSgpXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=