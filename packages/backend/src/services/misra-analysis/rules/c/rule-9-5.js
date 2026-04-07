"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_9_5 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 9.5
 * Where designated initializers are used to initialize an array object the size of the array shall be specified explicitly.
 */
class Rule_C_9_5 {
    id = 'MISRA-C-9.5';
    description = 'Where designated initializers are used to initialize an array object the size of the array shall be specified explicitly';
    severity = 'required';
    category = 'Initialization';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for array with designated initializers but no size
            if (line.includes('[') && line.includes(']') && line.includes('=')) {
                const arrayMatch = line.match(/\w+\s+\w+\[\s*\]\s*=\s*\{[^}]*\[/);
                if (arrayMatch) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Array with designated initializers should have explicit size', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_9_5 = Rule_C_9_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS05LTUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTktNS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLDBIQUEwSCxDQUFDO0lBQ3pJLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztJQUM1QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQywyREFBMkQ7WUFDM0QsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUM7Z0JBQ2xFLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2YsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDhEQUE4RCxFQUM5RCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWhDRCxnQ0FnQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgOS41XHJcbiAqIFdoZXJlIGRlc2lnbmF0ZWQgaW5pdGlhbGl6ZXJzIGFyZSB1c2VkIHRvIGluaXRpYWxpemUgYW4gYXJyYXkgb2JqZWN0IHRoZSBzaXplIG9mIHRoZSBhcnJheSBzaGFsbCBiZSBzcGVjaWZpZWQgZXhwbGljaXRseS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfOV81IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTkuNSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnV2hlcmUgZGVzaWduYXRlZCBpbml0aWFsaXplcnMgYXJlIHVzZWQgdG8gaW5pdGlhbGl6ZSBhbiBhcnJheSBvYmplY3QgdGhlIHNpemUgb2YgdGhlIGFycmF5IHNoYWxsIGJlIHNwZWNpZmllZCBleHBsaWNpdGx5JztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnSW5pdGlhbGl6YXRpb24nO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBhcnJheSB3aXRoIGRlc2lnbmF0ZWQgaW5pdGlhbGl6ZXJzIGJ1dCBubyBzaXplXHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCdbJykgJiYgbGluZS5pbmNsdWRlcygnXScpICYmIGxpbmUuaW5jbHVkZXMoJz0nKSkge1xyXG4gICAgICAgIGNvbnN0IGFycmF5TWF0Y2ggPSBsaW5lLm1hdGNoKC9cXHcrXFxzK1xcdytcXFtcXHMqXFxdXFxzKj1cXHMqXFx7W159XSpcXFsvKTtcclxuICAgICAgICBpZiAoYXJyYXlNYXRjaCkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdBcnJheSB3aXRoIGRlc2lnbmF0ZWQgaW5pdGlhbGl6ZXJzIHNob3VsZCBoYXZlIGV4cGxpY2l0IHNpemUnLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19