"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_15_5 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 15.5
 * A function shall have a single point of exit at the end of the function.
 * Detects functions with multiple return statements.
 */
class Rule_C_15_5 {
    id = 'MISRA-C-15.5';
    description = 'A function shall have a single point of exit at the end of the function';
    severity = 'advisory';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // For each function, count return statements
        for (const func of ast.functions) {
            const funcStartLine = func.line;
            // Find the end of the function by tracking braces
            let braceDepth = 0;
            let funcEndLine = funcStartLine;
            let foundOpenBrace = false;
            for (let i = funcStartLine - 1; i < lines.length; i++) {
                const line = lines[i];
                for (const ch of line) {
                    if (ch === '{') {
                        braceDepth++;
                        foundOpenBrace = true;
                    }
                    if (ch === '}') {
                        braceDepth--;
                    }
                }
                if (foundOpenBrace && braceDepth === 0) {
                    funcEndLine = i + 1;
                    break;
                }
            }
            // Count return statements in function body
            const returnLines = [];
            for (let i = funcStartLine; i < funcEndLine; i++) {
                const line = lines[i]?.trim() || '';
                if (/\breturn\b/.test(line) && !line.startsWith('//')) {
                    returnLines.push(i + 1);
                }
            }
            // If more than one return, report all but the last
            if (returnLines.length > 1) {
                for (let r = 0; r < returnLines.length - 1; r++) {
                    const lineIdx = returnLines[r] - 1;
                    violations.push((0, rule_engine_1.createViolation)(this, returnLines[r], 0, `Function '${func.name}' has multiple exit points`, lines[lineIdx]?.trim() || ''));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_15_5 = Rule_C_15_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNS01LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNS01LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLHlFQUF5RSxDQUFDO0lBQ3hGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsNkNBQTZDO1FBQzdDLEtBQUssTUFBTSxJQUFJLElBQUksR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFFaEMsa0RBQWtEO1lBQ2xELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztZQUNuQixJQUFJLFdBQVcsR0FBRyxhQUFhLENBQUM7WUFDaEMsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO1lBRTNCLEtBQUssSUFBSSxDQUFDLEdBQUcsYUFBYSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0RCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RCLEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ3RCLElBQUksRUFBRSxLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7b0JBQUMsQ0FBQztvQkFDeEQsSUFBSSxFQUFFLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQUMsVUFBVSxFQUFFLENBQUM7b0JBQUMsQ0FBQztnQkFDbkMsQ0FBQztnQkFDRCxJQUFJLGNBQWMsSUFBSSxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3ZDLFdBQVcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNwQixNQUFNO2dCQUNSLENBQUM7WUFDSCxDQUFDO1lBRUQsMkNBQTJDO1lBQzNDLE1BQU0sV0FBVyxHQUFhLEVBQUUsQ0FBQztZQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLGFBQWEsRUFBRSxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2pELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQ3BDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDdEQsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUM7WUFDSCxDQUFDO1lBRUQsbURBQW1EO1lBQ25ELElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ2hELE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ25DLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQ2QsQ0FBQyxFQUNELGFBQWEsSUFBSSxDQUFDLElBQUksNEJBQTRCLEVBQ2xELEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQzdCLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE1REQsa0NBNERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDE1LjVcclxuICogQSBmdW5jdGlvbiBzaGFsbCBoYXZlIGEgc2luZ2xlIHBvaW50IG9mIGV4aXQgYXQgdGhlIGVuZCBvZiB0aGUgZnVuY3Rpb24uXHJcbiAqIERldGVjdHMgZnVuY3Rpb25zIHdpdGggbXVsdGlwbGUgcmV0dXJuIHN0YXRlbWVudHMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE1XzUgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTUuNSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSBmdW5jdGlvbiBzaGFsbCBoYXZlIGEgc2luZ2xlIHBvaW50IG9mIGV4aXQgYXQgdGhlIGVuZCBvZiB0aGUgZnVuY3Rpb24nO1xyXG4gIHNldmVyaXR5ID0gJ2Fkdmlzb3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb250cm9sIGZsb3cnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIEZvciBlYWNoIGZ1bmN0aW9uLCBjb3VudCByZXR1cm4gc3RhdGVtZW50c1xyXG4gICAgZm9yIChjb25zdCBmdW5jIG9mIGFzdC5mdW5jdGlvbnMpIHtcclxuICAgICAgY29uc3QgZnVuY1N0YXJ0TGluZSA9IGZ1bmMubGluZTtcclxuXHJcbiAgICAgIC8vIEZpbmQgdGhlIGVuZCBvZiB0aGUgZnVuY3Rpb24gYnkgdHJhY2tpbmcgYnJhY2VzXHJcbiAgICAgIGxldCBicmFjZURlcHRoID0gMDtcclxuICAgICAgbGV0IGZ1bmNFbmRMaW5lID0gZnVuY1N0YXJ0TGluZTtcclxuICAgICAgbGV0IGZvdW5kT3BlbkJyYWNlID0gZmFsc2U7XHJcblxyXG4gICAgICBmb3IgKGxldCBpID0gZnVuY1N0YXJ0TGluZSAtIDE7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuICAgICAgICBmb3IgKGNvbnN0IGNoIG9mIGxpbmUpIHtcclxuICAgICAgICAgIGlmIChjaCA9PT0gJ3snKSB7IGJyYWNlRGVwdGgrKzsgZm91bmRPcGVuQnJhY2UgPSB0cnVlOyB9XHJcbiAgICAgICAgICBpZiAoY2ggPT09ICd9JykgeyBicmFjZURlcHRoLS07IH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGZvdW5kT3BlbkJyYWNlICYmIGJyYWNlRGVwdGggPT09IDApIHtcclxuICAgICAgICAgIGZ1bmNFbmRMaW5lID0gaSArIDE7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENvdW50IHJldHVybiBzdGF0ZW1lbnRzIGluIGZ1bmN0aW9uIGJvZHlcclxuICAgICAgY29uc3QgcmV0dXJuTGluZXM6IG51bWJlcltdID0gW107XHJcbiAgICAgIGZvciAobGV0IGkgPSBmdW5jU3RhcnRMaW5lOyBpIDwgZnVuY0VuZExpbmU7IGkrKykge1xyXG4gICAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXT8udHJpbSgpIHx8ICcnO1xyXG4gICAgICAgIGlmICgvXFxicmV0dXJuXFxiLy50ZXN0KGxpbmUpICYmICFsaW5lLnN0YXJ0c1dpdGgoJy8vJykpIHtcclxuICAgICAgICAgIHJldHVybkxpbmVzLnB1c2goaSArIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgbW9yZSB0aGFuIG9uZSByZXR1cm4sIHJlcG9ydCBhbGwgYnV0IHRoZSBsYXN0XHJcbiAgICAgIGlmIChyZXR1cm5MaW5lcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCByZXR1cm5MaW5lcy5sZW5ndGggLSAxOyByKyspIHtcclxuICAgICAgICAgIGNvbnN0IGxpbmVJZHggPSByZXR1cm5MaW5lc1tyXSAtIDE7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIHJldHVybkxpbmVzW3JdLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYEZ1bmN0aW9uICcke2Z1bmMubmFtZX0nIGhhcyBtdWx0aXBsZSBleGl0IHBvaW50c2AsXHJcbiAgICAgICAgICAgICAgbGluZXNbbGluZUlkeF0/LnRyaW0oKSB8fCAnJ1xyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=