"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_1_9 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 0-1-9
 * There shall be no dead code.
 * Detects code that can never be executed.
 */
class Rule_CPP_0_1_9 {
    id = 'MISRA-CPP-0.1.9';
    description = 'There shall be no dead code';
    severity = 'required';
    category = 'Unused code';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Check for code after return, break, continue, throw
            if (/\b(return|break|continue|throw)\b/.test(line)) {
                // Look at next non-empty, non-comment line
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (!nextLine || nextLine.startsWith('//'))
                        continue;
                    // If next line is closing brace or case/default, it's OK
                    if (/^[}]/.test(nextLine) || /^(case|default)\b/.test(nextLine))
                        break;
                    violations.push((0, rule_engine_1.createViolation)(this, j + 1, 0, 'Dead code detected after control flow statement', nextLine));
                    break;
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_0_1_9 = Rule_CPP_0_1_9;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTEtOS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0xLTkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw2QkFBNkIsQ0FBQztJQUM1QyxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRXJFLHNEQUFzRDtZQUN0RCxJQUFJLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNuRCwyQ0FBMkM7Z0JBQzNDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUMxQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2pDLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7d0JBQUUsU0FBUztvQkFFckQseURBQXlEO29CQUN6RCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQzt3QkFBRSxNQUFNO29CQUV2RSxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsaURBQWlELEVBQ2pELFFBQVEsQ0FDVCxDQUNGLENBQUM7b0JBQ0YsTUFBTTtnQkFDUixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUF6Q0Qsd0NBeUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMC0xLTlcclxuICogVGhlcmUgc2hhbGwgYmUgbm8gZGVhZCBjb2RlLlxyXG4gKiBEZXRlY3RzIGNvZGUgdGhhdCBjYW4gbmV2ZXIgYmUgZXhlY3V0ZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMF8xXzkgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0wLjEuOSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlcmUgc2hhbGwgYmUgbm8gZGVhZCBjb2RlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnVW51c2VkIGNvZGUnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGZvciBjb2RlIGFmdGVyIHJldHVybiwgYnJlYWssIGNvbnRpbnVlLCB0aHJvd1xyXG4gICAgICBpZiAoL1xcYihyZXR1cm58YnJlYWt8Y29udGludWV8dGhyb3cpXFxiLy50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgLy8gTG9vayBhdCBuZXh0IG5vbi1lbXB0eSwgbm9uLWNvbW1lbnQgbGluZVxyXG4gICAgICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IGxpbmVzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICBjb25zdCBuZXh0TGluZSA9IGxpbmVzW2pdLnRyaW0oKTtcclxuICAgICAgICAgIGlmICghbmV4dExpbmUgfHwgbmV4dExpbmUuc3RhcnRzV2l0aCgnLy8nKSkgY29udGludWU7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIElmIG5leHQgbGluZSBpcyBjbG9zaW5nIGJyYWNlIG9yIGNhc2UvZGVmYXVsdCwgaXQncyBPS1xyXG4gICAgICAgICAgaWYgKC9eW31dLy50ZXN0KG5leHRMaW5lKSB8fCAvXihjYXNlfGRlZmF1bHQpXFxiLy50ZXN0KG5leHRMaW5lKSkgYnJlYWs7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaiArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnRGVhZCBjb2RlIGRldGVjdGVkIGFmdGVyIGNvbnRyb2wgZmxvdyBzdGF0ZW1lbnQnLFxyXG4gICAgICAgICAgICAgIG5leHRMaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19