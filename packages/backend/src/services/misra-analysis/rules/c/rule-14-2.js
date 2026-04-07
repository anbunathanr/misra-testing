"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_14_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 14.2
 * A for loop shall be well-formed.
 * Detects for loops that don't follow the standard pattern:
 * for (init; condition; update) where each clause is present.
 */
class Rule_C_14_2 {
    id = 'MISRA-C-14.2';
    description = 'A for loop shall be well-formed';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect for loops with empty clauses: for(;;), for(;cond;), for(init;;), for(;;update)
        // A well-formed for loop should have all three clauses non-empty
        const emptyForClauseRegex = /\bfor\s*\(\s*;|;\s*;|\bfor\s*\(\s*[^;]*;\s*\)/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            if (emptyForClauseRegex.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'For loop is not well-formed; all three clauses (init; condition; update) should be present', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_14_2 = Rule_C_14_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNC0yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNC0yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyxpQ0FBaUMsQ0FBQztJQUNoRCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLHdGQUF3RjtRQUN4RixpRUFBaUU7UUFDakUsTUFBTSxtQkFBbUIsR0FBRywrQ0FBK0MsQ0FBQztRQUU1RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNuQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsNEZBQTRGLEVBQzVGLElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQW5DRCxrQ0FtQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTQuMlxyXG4gKiBBIGZvciBsb29wIHNoYWxsIGJlIHdlbGwtZm9ybWVkLlxyXG4gKiBEZXRlY3RzIGZvciBsb29wcyB0aGF0IGRvbid0IGZvbGxvdyB0aGUgc3RhbmRhcmQgcGF0dGVybjpcclxuICogZm9yIChpbml0OyBjb25kaXRpb247IHVwZGF0ZSkgd2hlcmUgZWFjaCBjbGF1c2UgaXMgcHJlc2VudC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTRfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xNC4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdBIGZvciBsb29wIHNoYWxsIGJlIHdlbGwtZm9ybWVkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udHJvbCBmbG93JztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBEZXRlY3QgZm9yIGxvb3BzIHdpdGggZW1wdHkgY2xhdXNlczogZm9yKDs7KSwgZm9yKDtjb25kOyksIGZvcihpbml0OzspLCBmb3IoOzt1cGRhdGUpXHJcbiAgICAvLyBBIHdlbGwtZm9ybWVkIGZvciBsb29wIHNob3VsZCBoYXZlIGFsbCB0aHJlZSBjbGF1c2VzIG5vbi1lbXB0eVxyXG4gICAgY29uc3QgZW1wdHlGb3JDbGF1c2VSZWdleCA9IC9cXGJmb3JcXHMqXFwoXFxzKjt8O1xccyo7fFxcYmZvclxccypcXChcXHMqW147XSo7XFxzKlxcKS87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICBpZiAoZW1wdHlGb3JDbGF1c2VSZWdleC50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0ZvciBsb29wIGlzIG5vdCB3ZWxsLWZvcm1lZDsgYWxsIHRocmVlIGNsYXVzZXMgKGluaXQ7IGNvbmRpdGlvbjsgdXBkYXRlKSBzaG91bGQgYmUgcHJlc2VudCcsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==