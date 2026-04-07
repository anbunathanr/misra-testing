"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.1
 * Types shall be explicitly specified.
 * Detects implicit int (old-style C function declarations without explicit return type).
 */
class Rule_C_8_1 {
    id = 'MISRA-C-8.1';
    description = 'Types shall be explicitly specified';
    severity = 'required';
    category = 'Declarations';
    language = 'C';
    typeKeywords = new Set([
        'int', 'char', 'short', 'long', 'float', 'double', 'void',
        'unsigned', 'signed', 'struct', 'union', 'enum', 'typedef',
        'const', 'volatile', 'static', 'extern', 'inline', 'auto',
        'register', '_Bool', '_Complex',
    ]);
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Look for function definitions without explicit return type
        // Pattern: name(params) { — no type keyword before name
        const implicitFuncRegex = /^([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{?\s*$/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip preprocessor, comments, empty lines
            if (line.startsWith('#') || line.startsWith('//') || line.startsWith('*') || !line)
                continue;
            const match = line.match(implicitFuncRegex);
            if (match) {
                const name = match[1];
                // If the name is not a keyword and there's no type before it, it's implicit int
                if (!this.typeKeywords.has(name) && !['if', 'for', 'while', 'switch', 'do', 'else'].includes(name)) {
                    // Check previous line for a type
                    const prevLine = i > 0 ? lines[i - 1].trim() : '';
                    const hasTypeOnPrevLine = [...this.typeKeywords].some(t => prevLine.includes(t));
                    if (!hasTypeOnPrevLine) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Function '${name}' declared without explicit return type (implicit int)`, line));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_8_1 = Rule_C_8_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTgtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7R0FJRztBQUNILE1BQWEsVUFBVTtJQUNyQixFQUFFLEdBQUcsYUFBYSxDQUFDO0lBQ25CLFdBQVcsR0FBRyxxQ0FBcUMsQ0FBQztJQUNwRCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFUCxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDdEMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTTtRQUN6RCxVQUFVLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVM7UUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNO1FBQ3pELFVBQVUsRUFBRSxPQUFPLEVBQUUsVUFBVTtLQUNoQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsNkRBQTZEO1FBQzdELHdEQUF3RDtRQUN4RCxNQUFNLGlCQUFpQixHQUFHLHVDQUF1QyxDQUFDO1FBRWxFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdCLDJDQUEyQztZQUMzQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRTdGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUM1QyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNWLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEIsZ0ZBQWdGO2dCQUNoRixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ25HLGlDQUFpQztvQkFDakMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNsRCxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUVqRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQzt3QkFDdkIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGFBQWEsSUFBSSx3REFBd0QsRUFDekUsSUFBSSxDQUNMLENBQ0YsQ0FBQztvQkFDSixDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXRERCxnQ0FzREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgOC4xXHJcbiAqIFR5cGVzIHNoYWxsIGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkLlxyXG4gKiBEZXRlY3RzIGltcGxpY2l0IGludCAob2xkLXN0eWxlIEMgZnVuY3Rpb24gZGVjbGFyYXRpb25zIHdpdGhvdXQgZXhwbGljaXQgcmV0dXJuIHR5cGUpLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ184XzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtOC4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdUeXBlcyBzaGFsbCBiZSBleHBsaWNpdGx5IHNwZWNpZmllZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIHByaXZhdGUgcmVhZG9ubHkgdHlwZUtleXdvcmRzID0gbmV3IFNldChbXHJcbiAgICAnaW50JywgJ2NoYXInLCAnc2hvcnQnLCAnbG9uZycsICdmbG9hdCcsICdkb3VibGUnLCAndm9pZCcsXHJcbiAgICAndW5zaWduZWQnLCAnc2lnbmVkJywgJ3N0cnVjdCcsICd1bmlvbicsICdlbnVtJywgJ3R5cGVkZWYnLFxyXG4gICAgJ2NvbnN0JywgJ3ZvbGF0aWxlJywgJ3N0YXRpYycsICdleHRlcm4nLCAnaW5saW5lJywgJ2F1dG8nLFxyXG4gICAgJ3JlZ2lzdGVyJywgJ19Cb29sJywgJ19Db21wbGV4JyxcclxuICBdKTtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBMb29rIGZvciBmdW5jdGlvbiBkZWZpbml0aW9ucyB3aXRob3V0IGV4cGxpY2l0IHJldHVybiB0eXBlXHJcbiAgICAvLyBQYXR0ZXJuOiBuYW1lKHBhcmFtcykgeyDigJQgbm8gdHlwZSBrZXl3b3JkIGJlZm9yZSBuYW1lXHJcbiAgICBjb25zdCBpbXBsaWNpdEZ1bmNSZWdleCA9IC9eKFthLXpBLVpfXVxcdyopXFxzKlxcKFteKV0qXFwpXFxzKlxcez9cXHMqJC87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgLy8gU2tpcCBwcmVwcm9jZXNzb3IsIGNvbW1lbnRzLCBlbXB0eSBsaW5lc1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcjJykgfHwgbGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnKicpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaChpbXBsaWNpdEZ1bmNSZWdleCk7XHJcbiAgICAgIGlmIChtYXRjaCkge1xyXG4gICAgICAgIGNvbnN0IG5hbWUgPSBtYXRjaFsxXTtcclxuICAgICAgICAvLyBJZiB0aGUgbmFtZSBpcyBub3QgYSBrZXl3b3JkIGFuZCB0aGVyZSdzIG5vIHR5cGUgYmVmb3JlIGl0LCBpdCdzIGltcGxpY2l0IGludFxyXG4gICAgICAgIGlmICghdGhpcy50eXBlS2V5d29yZHMuaGFzKG5hbWUpICYmICFbJ2lmJywgJ2ZvcicsICd3aGlsZScsICdzd2l0Y2gnLCAnZG8nLCAnZWxzZSddLmluY2x1ZGVzKG5hbWUpKSB7XHJcbiAgICAgICAgICAvLyBDaGVjayBwcmV2aW91cyBsaW5lIGZvciBhIHR5cGVcclxuICAgICAgICAgIGNvbnN0IHByZXZMaW5lID0gaSA+IDAgPyBsaW5lc1tpIC0gMV0udHJpbSgpIDogJyc7XHJcbiAgICAgICAgICBjb25zdCBoYXNUeXBlT25QcmV2TGluZSA9IFsuLi50aGlzLnR5cGVLZXl3b3Jkc10uc29tZSh0ID0+IHByZXZMaW5lLmluY2x1ZGVzKHQpKTtcclxuXHJcbiAgICAgICAgICBpZiAoIWhhc1R5cGVPblByZXZMaW5lKSB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgYEZ1bmN0aW9uICcke25hbWV9JyBkZWNsYXJlZCB3aXRob3V0IGV4cGxpY2l0IHJldHVybiB0eXBlIChpbXBsaWNpdCBpbnQpYCxcclxuICAgICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==