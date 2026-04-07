"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_16_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 16.4
 * Every switch statement shall have a default label.
 */
class Rule_C_16_4 {
    id = 'MISRA-C-16.4';
    description = 'Every switch statement shall have a default label';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            if (line.startsWith('switch')) {
                let braceCount = 0;
                let foundDefault = false;
                // Check lines within switch statement
                for (let j = i; j < ast.lines.length; j++) {
                    const switchLine = ast.lines[j].trim();
                    if (switchLine.includes('{'))
                        braceCount++;
                    if (switchLine.includes('}'))
                        braceCount--;
                    if (switchLine.startsWith('default')) {
                        foundDefault = true;
                    }
                    if (braceCount === 0 && j > i)
                        break;
                }
                if (!foundDefault) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Switch statement missing default label', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_16_4 = Rule_C_16_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNi00LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNi00LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsbURBQW1ELENBQUM7SUFDbEUsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQixJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7Z0JBRXpCLHNDQUFzQztnQkFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzFDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBRXZDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7d0JBQUUsVUFBVSxFQUFFLENBQUM7b0JBQzNDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7d0JBQUUsVUFBVSxFQUFFLENBQUM7b0JBRTNDLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO3dCQUNyQyxZQUFZLEdBQUcsSUFBSSxDQUFDO29CQUN0QixDQUFDO29CQUVELElBQUksVUFBVSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQzt3QkFBRSxNQUFNO2dCQUN2QyxDQUFDO2dCQUVELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDbEIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHdDQUF3QyxFQUN4QyxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQS9DRCxrQ0ErQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTYuNFxyXG4gKiBFdmVyeSBzd2l0Y2ggc3RhdGVtZW50IHNoYWxsIGhhdmUgYSBkZWZhdWx0IGxhYmVsLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xNl80IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE2LjQnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0V2ZXJ5IHN3aXRjaCBzdGF0ZW1lbnQgc2hhbGwgaGF2ZSBhIGRlZmF1bHQgbGFiZWwnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb250cm9sIGZsb3cnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ3N3aXRjaCcpKSB7XHJcbiAgICAgICAgbGV0IGJyYWNlQ291bnQgPSAwO1xyXG4gICAgICAgIGxldCBmb3VuZERlZmF1bHQgPSBmYWxzZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBsaW5lcyB3aXRoaW4gc3dpdGNoIHN0YXRlbWVudFxyXG4gICAgICAgIGZvciAobGV0IGogPSBpOyBqIDwgYXN0LmxpbmVzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICBjb25zdCBzd2l0Y2hMaW5lID0gYXN0LmxpbmVzW2pdLnRyaW0oKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKHN3aXRjaExpbmUuaW5jbHVkZXMoJ3snKSkgYnJhY2VDb3VudCsrO1xyXG4gICAgICAgICAgaWYgKHN3aXRjaExpbmUuaW5jbHVkZXMoJ30nKSkgYnJhY2VDb3VudC0tO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoc3dpdGNoTGluZS5zdGFydHNXaXRoKCdkZWZhdWx0JykpIHtcclxuICAgICAgICAgICAgZm91bmREZWZhdWx0ID0gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGJyYWNlQ291bnQgPT09IDAgJiYgaiA+IGkpIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAoIWZvdW5kRGVmYXVsdCkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdTd2l0Y2ggc3RhdGVtZW50IG1pc3NpbmcgZGVmYXVsdCBsYWJlbCcsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=