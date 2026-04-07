"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_14_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 14.1
 * A loop counter shall not have essentially floating-point type.
 * Detects for loop counters declared as float or double.
 */
class Rule_C_14_1 {
    id = 'MISRA-C-14.1';
    description = 'A loop counter shall not have essentially floating-point type';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect for loops with float/double counter: for (float f = ...) or for (double d = ...)
        const floatLoopCounterRegex = /\bfor\s*\(\s*(?:float|double)\s+\w+/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            if (floatLoopCounterRegex.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Loop counter has floating-point type; use integer type for loop counters', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_14_1 = Rule_C_14_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNC0xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNC0xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLCtEQUErRCxDQUFDO0lBQzlFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsMEZBQTBGO1FBQzFGLE1BQU0scUJBQXFCLEdBQUcscUNBQXFDLENBQUM7UUFFcEUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDckMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDBFQUEwRSxFQUMxRSxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFsQ0Qsa0NBa0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDE0LjFcclxuICogQSBsb29wIGNvdW50ZXIgc2hhbGwgbm90IGhhdmUgZXNzZW50aWFsbHkgZmxvYXRpbmctcG9pbnQgdHlwZS5cclxuICogRGV0ZWN0cyBmb3IgbG9vcCBjb3VudGVycyBkZWNsYXJlZCBhcyBmbG9hdCBvciBkb3VibGUuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE0XzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTQuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSBsb29wIGNvdW50ZXIgc2hhbGwgbm90IGhhdmUgZXNzZW50aWFsbHkgZmxvYXRpbmctcG9pbnQgdHlwZSc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0NvbnRyb2wgZmxvdyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRGV0ZWN0IGZvciBsb29wcyB3aXRoIGZsb2F0L2RvdWJsZSBjb3VudGVyOiBmb3IgKGZsb2F0IGYgPSAuLi4pIG9yIGZvciAoZG91YmxlIGQgPSAuLi4pXHJcbiAgICBjb25zdCBmbG9hdExvb3BDb3VudGVyUmVnZXggPSAvXFxiZm9yXFxzKlxcKFxccyooPzpmbG9hdHxkb3VibGUpXFxzK1xcdysvO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuXHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgaWYgKGZsb2F0TG9vcENvdW50ZXJSZWdleC50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0xvb3AgY291bnRlciBoYXMgZmxvYXRpbmctcG9pbnQgdHlwZTsgdXNlIGludGVnZXIgdHlwZSBmb3IgbG9vcCBjb3VudGVycycsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==