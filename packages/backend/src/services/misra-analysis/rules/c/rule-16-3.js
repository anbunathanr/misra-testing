"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_16_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 16.3
 * An unconditional break statement shall terminate every switch-clause.
 * Detects switch cases without break or fallthrough comment.
 */
class Rule_C_16_3 {
    id = 'MISRA-C-16.3';
    description = 'An unconditional break statement shall terminate every switch-clause';
    severity = 'required';
    category = 'Switch statements';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        let inSwitch = false;
        let switchDepth = 0;
        let caseStartLine = -1;
        let caseLabel = '';
        let hasBreak = false;
        let hasFallthrough = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (/\bswitch\s*\(/.test(line)) {
                inSwitch = true;
                switchDepth = 0;
            }
            if (inSwitch) {
                for (const ch of lines[i]) {
                    if (ch === '{')
                        switchDepth++;
                    if (ch === '}')
                        switchDepth--;
                }
                if (switchDepth <= 0 && inSwitch) {
                    // End of switch - check last case
                    if (caseStartLine >= 0 && !hasBreak && !hasFallthrough) {
                        violations.push((0, rule_engine_1.createViolation)(this, caseStartLine, 0, `Switch case '${caseLabel}' does not end with break or fallthrough comment`, lines[caseStartLine - 1]?.trim() || ''));
                    }
                    inSwitch = false;
                    caseStartLine = -1;
                    continue;
                }
                // Detect case/default labels
                if (/^\s*(?:case\s+\S+|default)\s*:/.test(lines[i])) {
                    // Check previous case
                    if (caseStartLine >= 0 && !hasBreak && !hasFallthrough) {
                        violations.push((0, rule_engine_1.createViolation)(this, caseStartLine, 0, `Switch case '${caseLabel}' does not end with break or fallthrough comment`, lines[caseStartLine - 1]?.trim() || ''));
                    }
                    caseStartLine = i + 1;
                    caseLabel = line.replace(':', '').trim();
                    hasBreak = false;
                    hasFallthrough = false;
                }
                if (/\bbreak\s*;/.test(line) || /\breturn\b/.test(line)) {
                    hasBreak = true;
                }
                // Allow explicit fallthrough comments
                if (/\/\*\s*falls?\s*through\s*\*\//i.test(line) ||
                    /\/\/\s*falls?\s*through/i.test(line) ||
                    /\/\*\s*fallthrough\s*\*\//i.test(line)) {
                    hasFallthrough = true;
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_16_3 = Rule_C_16_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNi0zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNi0zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLHNFQUFzRSxDQUFDO0lBQ3JGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDckIsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUNuQixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDckIsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBRTNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdCLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMvQixRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNiLEtBQUssTUFBTSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzFCLElBQUksRUFBRSxLQUFLLEdBQUc7d0JBQUUsV0FBVyxFQUFFLENBQUM7b0JBQzlCLElBQUksRUFBRSxLQUFLLEdBQUc7d0JBQUUsV0FBVyxFQUFFLENBQUM7Z0JBQ2hDLENBQUM7Z0JBRUQsSUFBSSxXQUFXLElBQUksQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNqQyxrQ0FBa0M7b0JBQ2xDLElBQUksYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO3dCQUN2RCxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osYUFBYSxFQUNiLENBQUMsRUFDRCxnQkFBZ0IsU0FBUyxrREFBa0QsRUFDM0UsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQ3ZDLENBQ0YsQ0FBQztvQkFDSixDQUFDO29CQUNELFFBQVEsR0FBRyxLQUFLLENBQUM7b0JBQ2pCLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDbkIsU0FBUztnQkFDWCxDQUFDO2dCQUVELDZCQUE2QjtnQkFDN0IsSUFBSSxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDcEQsc0JBQXNCO29CQUN0QixJQUFJLGFBQWEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDdkQsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLGFBQWEsRUFDYixDQUFDLEVBQ0QsZ0JBQWdCLFNBQVMsa0RBQWtELEVBQzNFLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUN2QyxDQUNGLENBQUM7b0JBQ0osQ0FBQztvQkFDRCxhQUFhLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDdEIsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUN6QyxRQUFRLEdBQUcsS0FBSyxDQUFDO29CQUNqQixjQUFjLEdBQUcsS0FBSyxDQUFDO2dCQUN6QixDQUFDO2dCQUVELElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ3hELFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQ2xCLENBQUM7Z0JBRUQsc0NBQXNDO2dCQUN0QyxJQUFJLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQzVDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ3JDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUM1QyxjQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFyRkQsa0NBcUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDE2LjNcclxuICogQW4gdW5jb25kaXRpb25hbCBicmVhayBzdGF0ZW1lbnQgc2hhbGwgdGVybWluYXRlIGV2ZXJ5IHN3aXRjaC1jbGF1c2UuXHJcbiAqIERldGVjdHMgc3dpdGNoIGNhc2VzIHdpdGhvdXQgYnJlYWsgb3IgZmFsbHRocm91Z2ggY29tbWVudC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTZfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xNi4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdBbiB1bmNvbmRpdGlvbmFsIGJyZWFrIHN0YXRlbWVudCBzaGFsbCB0ZXJtaW5hdGUgZXZlcnkgc3dpdGNoLWNsYXVzZSc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1N3aXRjaCBzdGF0ZW1lbnRzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICBsZXQgaW5Td2l0Y2ggPSBmYWxzZTtcclxuICAgIGxldCBzd2l0Y2hEZXB0aCA9IDA7XHJcbiAgICBsZXQgY2FzZVN0YXJ0TGluZSA9IC0xO1xyXG4gICAgbGV0IGNhc2VMYWJlbCA9ICcnO1xyXG4gICAgbGV0IGhhc0JyZWFrID0gZmFsc2U7XHJcbiAgICBsZXQgaGFzRmFsbHRocm91Z2ggPSBmYWxzZTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcblxyXG4gICAgICBpZiAoL1xcYnN3aXRjaFxccypcXCgvLnRlc3QobGluZSkpIHtcclxuICAgICAgICBpblN3aXRjaCA9IHRydWU7XHJcbiAgICAgICAgc3dpdGNoRGVwdGggPSAwO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaW5Td2l0Y2gpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGxpbmVzW2ldKSB7XHJcbiAgICAgICAgICBpZiAoY2ggPT09ICd7Jykgc3dpdGNoRGVwdGgrKztcclxuICAgICAgICAgIGlmIChjaCA9PT0gJ30nKSBzd2l0Y2hEZXB0aC0tO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHN3aXRjaERlcHRoIDw9IDAgJiYgaW5Td2l0Y2gpIHtcclxuICAgICAgICAgIC8vIEVuZCBvZiBzd2l0Y2ggLSBjaGVjayBsYXN0IGNhc2VcclxuICAgICAgICAgIGlmIChjYXNlU3RhcnRMaW5lID49IDAgJiYgIWhhc0JyZWFrICYmICFoYXNGYWxsdGhyb3VnaCkge1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICAgIGNhc2VTdGFydExpbmUsXHJcbiAgICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgYFN3aXRjaCBjYXNlICcke2Nhc2VMYWJlbH0nIGRvZXMgbm90IGVuZCB3aXRoIGJyZWFrIG9yIGZhbGx0aHJvdWdoIGNvbW1lbnRgLFxyXG4gICAgICAgICAgICAgICAgbGluZXNbY2FzZVN0YXJ0TGluZSAtIDFdPy50cmltKCkgfHwgJydcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpblN3aXRjaCA9IGZhbHNlO1xyXG4gICAgICAgICAgY2FzZVN0YXJ0TGluZSA9IC0xO1xyXG4gICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBEZXRlY3QgY2FzZS9kZWZhdWx0IGxhYmVsc1xyXG4gICAgICAgIGlmICgvXlxccyooPzpjYXNlXFxzK1xcUyt8ZGVmYXVsdClcXHMqOi8udGVzdChsaW5lc1tpXSkpIHtcclxuICAgICAgICAgIC8vIENoZWNrIHByZXZpb3VzIGNhc2VcclxuICAgICAgICAgIGlmIChjYXNlU3RhcnRMaW5lID49IDAgJiYgIWhhc0JyZWFrICYmICFoYXNGYWxsdGhyb3VnaCkge1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICAgIGNhc2VTdGFydExpbmUsXHJcbiAgICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgYFN3aXRjaCBjYXNlICcke2Nhc2VMYWJlbH0nIGRvZXMgbm90IGVuZCB3aXRoIGJyZWFrIG9yIGZhbGx0aHJvdWdoIGNvbW1lbnRgLFxyXG4gICAgICAgICAgICAgICAgbGluZXNbY2FzZVN0YXJ0TGluZSAtIDFdPy50cmltKCkgfHwgJydcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjYXNlU3RhcnRMaW5lID0gaSArIDE7XHJcbiAgICAgICAgICBjYXNlTGFiZWwgPSBsaW5lLnJlcGxhY2UoJzonLCAnJykudHJpbSgpO1xyXG4gICAgICAgICAgaGFzQnJlYWsgPSBmYWxzZTtcclxuICAgICAgICAgIGhhc0ZhbGx0aHJvdWdoID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoL1xcYmJyZWFrXFxzKjsvLnRlc3QobGluZSkgfHwgL1xcYnJldHVyblxcYi8udGVzdChsaW5lKSkge1xyXG4gICAgICAgICAgaGFzQnJlYWsgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQWxsb3cgZXhwbGljaXQgZmFsbHRocm91Z2ggY29tbWVudHNcclxuICAgICAgICBpZiAoL1xcL1xcKlxccypmYWxscz9cXHMqdGhyb3VnaFxccypcXCpcXC8vaS50ZXN0KGxpbmUpIHx8XHJcbiAgICAgICAgICAgIC9cXC9cXC9cXHMqZmFsbHM/XFxzKnRocm91Z2gvaS50ZXN0KGxpbmUpIHx8XHJcbiAgICAgICAgICAgIC9cXC9cXCpcXHMqZmFsbHRocm91Z2hcXHMqXFwqXFwvL2kudGVzdChsaW5lKSkge1xyXG4gICAgICAgICAgaGFzRmFsbHRocm91Z2ggPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=