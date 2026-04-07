"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_16_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 16.2
 * A switch label shall only be used when the most closely-enclosing compound statement is the body of a switch statement.
 */
class Rule_C_16_2 {
    id = 'MISRA-C-16.2';
    description = 'A switch label shall only be used when the most closely-enclosing compound statement is the body of a switch statement';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        let inSwitch = false;
        let switchDepth = 0;
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            if (line.startsWith('switch')) {
                inSwitch = true;
                switchDepth = 0;
            }
            if (inSwitch) {
                if (line.includes('{'))
                    switchDepth++;
                if (line.includes('}')) {
                    switchDepth--;
                    if (switchDepth === 0)
                        inSwitch = false;
                }
                // Check for case/default labels nested in other control structures
                if ((line.startsWith('case') || line.startsWith('default:')) && switchDepth > 1) {
                    // Check if there's a nested control structure
                    for (let j = i - 1; j >= 0 && switchDepth > 0; j--) {
                        const prevLine = ast.lines[j].trim();
                        if (prevLine.startsWith('if') || prevLine.startsWith('for') ||
                            prevLine.startsWith('while') || prevLine.startsWith('do')) {
                            violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Switch label used within nested control structure', line));
                            break;
                        }
                    }
                }
            }
            // Check for case/default outside switch
            if (!inSwitch && (line.startsWith('case') || line.startsWith('default:'))) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Switch label used outside switch statement', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_16_2 = Rule_C_16_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNi0yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNi0yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsd0hBQXdILENBQUM7SUFDdkksUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztRQUVwQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMxQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRWpDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM5QixRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNiLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7b0JBQUUsV0FBVyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUN2QixXQUFXLEVBQUUsQ0FBQztvQkFDZCxJQUFJLFdBQVcsS0FBSyxDQUFDO3dCQUFFLFFBQVEsR0FBRyxLQUFLLENBQUM7Z0JBQzFDLENBQUM7Z0JBRUQsbUVBQW1FO2dCQUNuRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNoRiw4Q0FBOEM7b0JBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3QkFDbkQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDckMsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDOzRCQUN2RCxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzs0QkFDOUQsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELG1EQUFtRCxFQUNuRCxJQUFJLENBQ0wsQ0FDRixDQUFDOzRCQUNGLE1BQU07d0JBQ1IsQ0FBQztvQkFDSCxDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1lBRUQsd0NBQXdDO1lBQ3hDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMxRSxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsNENBQTRDLEVBQzVDLElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWpFRCxrQ0FpRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTYuMlxyXG4gKiBBIHN3aXRjaCBsYWJlbCBzaGFsbCBvbmx5IGJlIHVzZWQgd2hlbiB0aGUgbW9zdCBjbG9zZWx5LWVuY2xvc2luZyBjb21wb3VuZCBzdGF0ZW1lbnQgaXMgdGhlIGJvZHkgb2YgYSBzd2l0Y2ggc3RhdGVtZW50LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xNl8yIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE2LjInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0Egc3dpdGNoIGxhYmVsIHNoYWxsIG9ubHkgYmUgdXNlZCB3aGVuIHRoZSBtb3N0IGNsb3NlbHktZW5jbG9zaW5nIGNvbXBvdW5kIHN0YXRlbWVudCBpcyB0aGUgYm9keSBvZiBhIHN3aXRjaCBzdGF0ZW1lbnQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb250cm9sIGZsb3cnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGxldCBpblN3aXRjaCA9IGZhbHNlO1xyXG4gICAgbGV0IHN3aXRjaERlcHRoID0gMDtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ3N3aXRjaCcpKSB7XHJcbiAgICAgICAgaW5Td2l0Y2ggPSB0cnVlO1xyXG4gICAgICAgIHN3aXRjaERlcHRoID0gMDtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgaWYgKGluU3dpdGNoKSB7XHJcbiAgICAgICAgaWYgKGxpbmUuaW5jbHVkZXMoJ3snKSkgc3dpdGNoRGVwdGgrKztcclxuICAgICAgICBpZiAobGluZS5pbmNsdWRlcygnfScpKSB7XHJcbiAgICAgICAgICBzd2l0Y2hEZXB0aC0tO1xyXG4gICAgICAgICAgaWYgKHN3aXRjaERlcHRoID09PSAwKSBpblN3aXRjaCA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3IgY2FzZS9kZWZhdWx0IGxhYmVscyBuZXN0ZWQgaW4gb3RoZXIgY29udHJvbCBzdHJ1Y3R1cmVzXHJcbiAgICAgICAgaWYgKChsaW5lLnN0YXJ0c1dpdGgoJ2Nhc2UnKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJ2RlZmF1bHQ6JykpICYmIHN3aXRjaERlcHRoID4gMSkge1xyXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlcmUncyBhIG5lc3RlZCBjb250cm9sIHN0cnVjdHVyZVxyXG4gICAgICAgICAgZm9yIChsZXQgaiA9IGkgLSAxOyBqID49IDAgJiYgc3dpdGNoRGVwdGggPiAwOyBqLS0pIHtcclxuICAgICAgICAgICAgY29uc3QgcHJldkxpbmUgPSBhc3QubGluZXNbal0udHJpbSgpO1xyXG4gICAgICAgICAgICBpZiAocHJldkxpbmUuc3RhcnRzV2l0aCgnaWYnKSB8fCBwcmV2TGluZS5zdGFydHNXaXRoKCdmb3InKSB8fCBcclxuICAgICAgICAgICAgICAgIHByZXZMaW5lLnN0YXJ0c1dpdGgoJ3doaWxlJykgfHwgcHJldkxpbmUuc3RhcnRzV2l0aCgnZG8nKSkge1xyXG4gICAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICAgICdTd2l0Y2ggbGFiZWwgdXNlZCB3aXRoaW4gbmVzdGVkIGNvbnRyb2wgc3RydWN0dXJlJyxcclxuICAgICAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBjYXNlL2RlZmF1bHQgb3V0c2lkZSBzd2l0Y2hcclxuICAgICAgaWYgKCFpblN3aXRjaCAmJiAobGluZS5zdGFydHNXaXRoKCdjYXNlJykgfHwgbGluZS5zdGFydHNXaXRoKCdkZWZhdWx0OicpKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdTd2l0Y2ggbGFiZWwgdXNlZCBvdXRzaWRlIHN3aXRjaCBzdGF0ZW1lbnQnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=