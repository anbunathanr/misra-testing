"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_11_6 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 11.6
 * A cast shall not be performed between pointer to void and an arithmetic type.
 */
class Rule_C_11_6 {
    id = 'MISRA-C-11.6';
    description = 'A cast shall not be performed between pointer to void and an arithmetic type';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for void* to arithmetic type
            const voidToArithMatch = line.match(/\((?:int|long|float|double|char)\)\s*\w+/);
            if (voidToArithMatch && line.includes('void')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Cast between void pointer and arithmetic type', line));
            }
            // Check for arithmetic type to void*
            const arithToVoidMatch = line.match(/\(void\s*\*\)\s*\d+/);
            if (arithToVoidMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Cast from arithmetic type to void pointer', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_11_6 = Rule_C_11_6;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMS02LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMS02LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsOEVBQThFLENBQUM7SUFDN0YsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFVBQVUsQ0FBQztJQUN0QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxxQ0FBcUM7WUFDckMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7WUFDaEYsSUFBSSxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCwrQ0FBK0MsRUFDL0MsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7WUFFRCxxQ0FBcUM7WUFDckMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDM0QsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNyQixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsMkNBQTJDLEVBQzNDLElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTVDRCxrQ0E0Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTEuNlxyXG4gKiBBIGNhc3Qgc2hhbGwgbm90IGJlIHBlcmZvcm1lZCBiZXR3ZWVuIHBvaW50ZXIgdG8gdm9pZCBhbmQgYW4gYXJpdGhtZXRpYyB0eXBlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xMV82IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTExLjYnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgY2FzdCBzaGFsbCBub3QgYmUgcGVyZm9ybWVkIGJldHdlZW4gcG9pbnRlciB0byB2b2lkIGFuZCBhbiBhcml0aG1ldGljIHR5cGUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdQb2ludGVycyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHZvaWQqIHRvIGFyaXRobWV0aWMgdHlwZVxyXG4gICAgICBjb25zdCB2b2lkVG9Bcml0aE1hdGNoID0gbGluZS5tYXRjaCgvXFwoKD86aW50fGxvbmd8ZmxvYXR8ZG91YmxlfGNoYXIpXFwpXFxzKlxcdysvKTtcclxuICAgICAgaWYgKHZvaWRUb0FyaXRoTWF0Y2ggJiYgbGluZS5pbmNsdWRlcygndm9pZCcpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0Nhc3QgYmV0d2VlbiB2b2lkIHBvaW50ZXIgYW5kIGFyaXRobWV0aWMgdHlwZScsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3IgYXJpdGhtZXRpYyB0eXBlIHRvIHZvaWQqXHJcbiAgICAgIGNvbnN0IGFyaXRoVG9Wb2lkTWF0Y2ggPSBsaW5lLm1hdGNoKC9cXCh2b2lkXFxzKlxcKlxcKVxccypcXGQrLyk7XHJcbiAgICAgIGlmIChhcml0aFRvVm9pZE1hdGNoKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0Nhc3QgZnJvbSBhcml0aG1ldGljIHR5cGUgdG8gdm9pZCBwb2ludGVyJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19