"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_7 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.7
 * Functions and objects should not be defined with external linkage if they are referenced in only one translation unit.
 */
class Rule_C_8_7 {
    id = 'MISRA-C-8.7';
    description = 'Functions and objects should not be defined with external linkage if they are referenced in only one translation unit';
    severity = 'advisory';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for non-static function definitions
            if (line.includes('{') && !line.includes('static') && !line.includes(';')) {
                const funcMatch = line.match(/\w+\s+(\w+)\s*\(/);
                if (funcMatch && funcMatch[1] !== 'main') {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Function '${funcMatch[1]}' should be static if only used in this file`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_8_7 = Rule_C_8_7;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTgtNy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLHVIQUF1SCxDQUFDO0lBQ3RJLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsNENBQTRDO1lBQzVDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFDakQsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sRUFBRSxDQUFDO29CQUN6QyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsYUFBYSxTQUFTLENBQUMsQ0FBQyxDQUFDLDhDQUE4QyxFQUN2RSxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWhDRCxnQ0FnQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgOC43XHJcbiAqIEZ1bmN0aW9ucyBhbmQgb2JqZWN0cyBzaG91bGQgbm90IGJlIGRlZmluZWQgd2l0aCBleHRlcm5hbCBsaW5rYWdlIGlmIHRoZXkgYXJlIHJlZmVyZW5jZWQgaW4gb25seSBvbmUgdHJhbnNsYXRpb24gdW5pdC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfOF83IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTguNyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnRnVuY3Rpb25zIGFuZCBvYmplY3RzIHNob3VsZCBub3QgYmUgZGVmaW5lZCB3aXRoIGV4dGVybmFsIGxpbmthZ2UgaWYgdGhleSBhcmUgcmVmZXJlbmNlZCBpbiBvbmx5IG9uZSB0cmFuc2xhdGlvbiB1bml0JztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRGVjbGFyYXRpb25zJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3Igbm9uLXN0YXRpYyBmdW5jdGlvbiBkZWZpbml0aW9uc1xyXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygneycpICYmICFsaW5lLmluY2x1ZGVzKCdzdGF0aWMnKSAmJiAhbGluZS5pbmNsdWRlcygnOycpKSB7XHJcbiAgICAgICAgY29uc3QgZnVuY01hdGNoID0gbGluZS5tYXRjaCgvXFx3K1xccysoXFx3KylcXHMqXFwoLyk7XHJcbiAgICAgICAgaWYgKGZ1bmNNYXRjaCAmJiBmdW5jTWF0Y2hbMV0gIT09ICdtYWluJykge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIGBGdW5jdGlvbiAnJHtmdW5jTWF0Y2hbMV19JyBzaG91bGQgYmUgc3RhdGljIGlmIG9ubHkgdXNlZCBpbiB0aGlzIGZpbGVgLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19