"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_16_5 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 16.5
 * A default label shall appear as either the first or the last switch label of a switch statement.
 */
class Rule_C_16_5 {
    id = 'MISRA-C-16.5';
    description = 'A default label shall appear as either the first or the last switch label of a switch statement';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            if (line.startsWith('switch')) {
                let braceCount = 0;
                let defaultLine = -1;
                let firstCaseLine = -1;
                let lastCaseLine = -1;
                let switchEndLine = -1;
                // Find all case labels and default
                for (let j = i; j < ast.lines.length; j++) {
                    const switchLine = ast.lines[j].trim();
                    if (switchLine.includes('{'))
                        braceCount++;
                    if (switchLine.includes('}')) {
                        braceCount--;
                        if (braceCount === 0 && j > i) {
                            switchEndLine = j;
                            break;
                        }
                    }
                    if (switchLine.startsWith('case')) {
                        if (firstCaseLine === -1)
                            firstCaseLine = j;
                        lastCaseLine = j;
                    }
                    if (switchLine.startsWith('default')) {
                        defaultLine = j;
                    }
                }
                // Check if default is in the middle
                if (defaultLine !== -1 && firstCaseLine !== -1 && lastCaseLine !== -1) {
                    if (defaultLine > firstCaseLine && defaultLine < lastCaseLine) {
                        violations.push((0, rule_engine_1.createViolation)(this, defaultLine + 1, 0, 'Default label should be first or last in switch statement', ast.lines[defaultLine]));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_16_5 = Rule_C_16_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNi01LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNi01LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsaUdBQWlHLENBQUM7SUFDaEgsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDckIsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFFdkIsbUNBQW1DO2dCQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDMUMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFFdkMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQzt3QkFBRSxVQUFVLEVBQUUsQ0FBQztvQkFDM0MsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQzdCLFVBQVUsRUFBRSxDQUFDO3dCQUNiLElBQUksVUFBVSxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQzlCLGFBQWEsR0FBRyxDQUFDLENBQUM7NEJBQ2xCLE1BQU07d0JBQ1IsQ0FBQztvQkFDSCxDQUFDO29CQUVELElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO3dCQUNsQyxJQUFJLGFBQWEsS0FBSyxDQUFDLENBQUM7NEJBQUUsYUFBYSxHQUFHLENBQUMsQ0FBQzt3QkFDNUMsWUFBWSxHQUFHLENBQUMsQ0FBQztvQkFDbkIsQ0FBQztvQkFFRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQzt3QkFDckMsV0FBVyxHQUFHLENBQUMsQ0FBQztvQkFDbEIsQ0FBQztnQkFDSCxDQUFDO2dCQUVELG9DQUFvQztnQkFDcEMsSUFBSSxXQUFXLEtBQUssQ0FBQyxDQUFDLElBQUksYUFBYSxLQUFLLENBQUMsQ0FBQyxJQUFJLFlBQVksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN0RSxJQUFJLFdBQVcsR0FBRyxhQUFhLElBQUksV0FBVyxHQUFHLFlBQVksRUFBRSxDQUFDO3dCQUM5RCxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osV0FBVyxHQUFHLENBQUMsRUFDZixDQUFDLEVBQ0QsMkRBQTJELEVBQzNELEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQ3ZCLENBQ0YsQ0FBQztvQkFDSixDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTlERCxrQ0E4REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTYuNVxyXG4gKiBBIGRlZmF1bHQgbGFiZWwgc2hhbGwgYXBwZWFyIGFzIGVpdGhlciB0aGUgZmlyc3Qgb3IgdGhlIGxhc3Qgc3dpdGNoIGxhYmVsIG9mIGEgc3dpdGNoIHN0YXRlbWVudC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTZfNSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xNi41JztcclxuICBkZXNjcmlwdGlvbiA9ICdBIGRlZmF1bHQgbGFiZWwgc2hhbGwgYXBwZWFyIGFzIGVpdGhlciB0aGUgZmlyc3Qgb3IgdGhlIGxhc3Qgc3dpdGNoIGxhYmVsIG9mIGEgc3dpdGNoIHN0YXRlbWVudCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0NvbnRyb2wgZmxvdyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnc3dpdGNoJykpIHtcclxuICAgICAgICBsZXQgYnJhY2VDb3VudCA9IDA7XHJcbiAgICAgICAgbGV0IGRlZmF1bHRMaW5lID0gLTE7XHJcbiAgICAgICAgbGV0IGZpcnN0Q2FzZUxpbmUgPSAtMTtcclxuICAgICAgICBsZXQgbGFzdENhc2VMaW5lID0gLTE7XHJcbiAgICAgICAgbGV0IHN3aXRjaEVuZExpbmUgPSAtMTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBGaW5kIGFsbCBjYXNlIGxhYmVscyBhbmQgZGVmYXVsdFxyXG4gICAgICAgIGZvciAobGV0IGogPSBpOyBqIDwgYXN0LmxpbmVzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICBjb25zdCBzd2l0Y2hMaW5lID0gYXN0LmxpbmVzW2pdLnRyaW0oKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKHN3aXRjaExpbmUuaW5jbHVkZXMoJ3snKSkgYnJhY2VDb3VudCsrO1xyXG4gICAgICAgICAgaWYgKHN3aXRjaExpbmUuaW5jbHVkZXMoJ30nKSkge1xyXG4gICAgICAgICAgICBicmFjZUNvdW50LS07XHJcbiAgICAgICAgICAgIGlmIChicmFjZUNvdW50ID09PSAwICYmIGogPiBpKSB7XHJcbiAgICAgICAgICAgICAgc3dpdGNoRW5kTGluZSA9IGo7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKHN3aXRjaExpbmUuc3RhcnRzV2l0aCgnY2FzZScpKSB7XHJcbiAgICAgICAgICAgIGlmIChmaXJzdENhc2VMaW5lID09PSAtMSkgZmlyc3RDYXNlTGluZSA9IGo7XHJcbiAgICAgICAgICAgIGxhc3RDYXNlTGluZSA9IGo7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmIChzd2l0Y2hMaW5lLnN0YXJ0c1dpdGgoJ2RlZmF1bHQnKSkge1xyXG4gICAgICAgICAgICBkZWZhdWx0TGluZSA9IGo7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGlmIGRlZmF1bHQgaXMgaW4gdGhlIG1pZGRsZVxyXG4gICAgICAgIGlmIChkZWZhdWx0TGluZSAhPT0gLTEgJiYgZmlyc3RDYXNlTGluZSAhPT0gLTEgJiYgbGFzdENhc2VMaW5lICE9PSAtMSkge1xyXG4gICAgICAgICAgaWYgKGRlZmF1bHRMaW5lID4gZmlyc3RDYXNlTGluZSAmJiBkZWZhdWx0TGluZSA8IGxhc3RDYXNlTGluZSkge1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICAgIGRlZmF1bHRMaW5lICsgMSxcclxuICAgICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICAnRGVmYXVsdCBsYWJlbCBzaG91bGQgYmUgZmlyc3Qgb3IgbGFzdCBpbiBzd2l0Y2ggc3RhdGVtZW50JyxcclxuICAgICAgICAgICAgICAgIGFzdC5saW5lc1tkZWZhdWx0TGluZV1cclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==