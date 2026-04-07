"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_14_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 14.3
 * Controlling expressions shall not be invariant.
 */
class Rule_C_14_3 {
    id = 'MISRA-C-14.3';
    description = 'Controlling expressions shall not be invariant';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for constant conditions in if statements
            const ifMatch = line.match(/if\s*\(\s*(true|false|0|1|NULL)\s*\)/);
            if (ifMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Invariant condition in if statement: ${ifMatch[1]}`, line));
            }
            // Check for constant conditions in while loops
            const whileMatch = line.match(/while\s*\(\s*(true|false|0|1)\s*\)/);
            if (whileMatch && whileMatch[1] !== '1' && whileMatch[1] !== 'true') {
                // while(1) and while(true) are acceptable for infinite loops
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Invariant condition in while loop: ${whileMatch[1]}`, line));
            }
            // Check for constant conditions in for loops
            const forMatch = line.match(/for\s*\([^;]*;\s*(true|false|0|1)\s*;/);
            if (forMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Invariant condition in for loop: ${forMatch[1]}`, line));
            }
        }
        return violations;
    }
}
exports.Rule_C_14_3 = Rule_C_14_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNC0zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNC0zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsZ0RBQWdELENBQUM7SUFDL0QsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxpREFBaUQ7WUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1lBQ25FLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ1osVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHdDQUF3QyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFDcEQsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7WUFFRCwrQ0FBK0M7WUFDL0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQ3BFLElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUNwRSw2REFBNkQ7Z0JBQzdELFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxzQ0FBc0MsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQ3JELElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1lBRUQsNkNBQTZDO1lBQzdDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQztZQUNyRSxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNiLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxvQ0FBb0MsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQ2pELElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTNERCxrQ0EyREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTQuM1xyXG4gKiBDb250cm9sbGluZyBleHByZXNzaW9ucyBzaGFsbCBub3QgYmUgaW52YXJpYW50LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xNF8zIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE0LjMnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0NvbnRyb2xsaW5nIGV4cHJlc3Npb25zIHNoYWxsIG5vdCBiZSBpbnZhcmlhbnQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb250cm9sIGZsb3cnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBjb25zdGFudCBjb25kaXRpb25zIGluIGlmIHN0YXRlbWVudHNcclxuICAgICAgY29uc3QgaWZNYXRjaCA9IGxpbmUubWF0Y2goL2lmXFxzKlxcKFxccyoodHJ1ZXxmYWxzZXwwfDF8TlVMTClcXHMqXFwpLyk7XHJcbiAgICAgIGlmIChpZk1hdGNoKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgYEludmFyaWFudCBjb25kaXRpb24gaW4gaWYgc3RhdGVtZW50OiAke2lmTWF0Y2hbMV19YCxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBjb25zdGFudCBjb25kaXRpb25zIGluIHdoaWxlIGxvb3BzXHJcbiAgICAgIGNvbnN0IHdoaWxlTWF0Y2ggPSBsaW5lLm1hdGNoKC93aGlsZVxccypcXChcXHMqKHRydWV8ZmFsc2V8MHwxKVxccypcXCkvKTtcclxuICAgICAgaWYgKHdoaWxlTWF0Y2ggJiYgd2hpbGVNYXRjaFsxXSAhPT0gJzEnICYmIHdoaWxlTWF0Y2hbMV0gIT09ICd0cnVlJykge1xyXG4gICAgICAgIC8vIHdoaWxlKDEpIGFuZCB3aGlsZSh0cnVlKSBhcmUgYWNjZXB0YWJsZSBmb3IgaW5maW5pdGUgbG9vcHNcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICBgSW52YXJpYW50IGNvbmRpdGlvbiBpbiB3aGlsZSBsb29wOiAke3doaWxlTWF0Y2hbMV19YCxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBjb25zdGFudCBjb25kaXRpb25zIGluIGZvciBsb29wc1xyXG4gICAgICBjb25zdCBmb3JNYXRjaCA9IGxpbmUubWF0Y2goL2ZvclxccypcXChbXjtdKjtcXHMqKHRydWV8ZmFsc2V8MHwxKVxccyo7Lyk7XHJcbiAgICAgIGlmIChmb3JNYXRjaCkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgIGBJbnZhcmlhbnQgY29uZGl0aW9uIGluIGZvciBsb29wOiAke2Zvck1hdGNoWzFdfWAsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==