"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_10_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 10.2
 * Expressions of essentially character type shall not be used inappropriately in addition and subtraction operations.
 */
class Rule_C_10_2 {
    id = 'MISRA-C-10.2';
    description = 'Expressions of essentially character type shall not be used inappropriately in addition and subtraction operations';
    severity = 'required';
    category = 'Conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for char arithmetic
            const charArithMatch = line.match(/char\s+\w+\s*=\s*[^;]*[+\-][^;]*/);
            if (charArithMatch && !line.includes('(int)')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Character type used in arithmetic operation without cast', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_10_2 = Rule_C_10_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMC0yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMC0yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsb0hBQW9ILENBQUM7SUFDbkksUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyw0QkFBNEI7WUFDNUIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1lBQ3RFLElBQUksY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsMERBQTBELEVBQzFELElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTlCRCxrQ0E4QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTAuMlxyXG4gKiBFeHByZXNzaW9ucyBvZiBlc3NlbnRpYWxseSBjaGFyYWN0ZXIgdHlwZSBzaGFsbCBub3QgYmUgdXNlZCBpbmFwcHJvcHJpYXRlbHkgaW4gYWRkaXRpb24gYW5kIHN1YnRyYWN0aW9uIG9wZXJhdGlvbnMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzEwXzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTAuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnRXhwcmVzc2lvbnMgb2YgZXNzZW50aWFsbHkgY2hhcmFjdGVyIHR5cGUgc2hhbGwgbm90IGJlIHVzZWQgaW5hcHByb3ByaWF0ZWx5IGluIGFkZGl0aW9uIGFuZCBzdWJ0cmFjdGlvbiBvcGVyYXRpb25zJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udmVyc2lvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBjaGFyIGFyaXRobWV0aWNcclxuICAgICAgY29uc3QgY2hhckFyaXRoTWF0Y2ggPSBsaW5lLm1hdGNoKC9jaGFyXFxzK1xcdytcXHMqPVxccypbXjtdKlsrXFwtXVteO10qLyk7XHJcbiAgICAgIGlmIChjaGFyQXJpdGhNYXRjaCAmJiAhbGluZS5pbmNsdWRlcygnKGludCknKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdDaGFyYWN0ZXIgdHlwZSB1c2VkIGluIGFyaXRobWV0aWMgb3BlcmF0aW9uIHdpdGhvdXQgY2FzdCcsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==