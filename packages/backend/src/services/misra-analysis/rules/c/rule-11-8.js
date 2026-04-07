"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_11_8 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 11.8
 * A cast shall not remove any const or volatile qualification from the type pointed to by a pointer.
 */
class Rule_C_11_8 {
    id = 'MISRA-C-11.8';
    description = 'A cast shall not remove any const or volatile qualification from the type pointed to by a pointer';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for cast that removes const
            if (line.includes('const') && line.includes('(')) {
                const castMatch = line.match(/\((\w+\s*\*)\)\s*\w+/);
                if (castMatch && !castMatch[1].includes('const')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Cast removes const qualification from pointer', line));
                }
            }
            // Check for cast that removes volatile
            if (line.includes('volatile') && line.includes('(')) {
                const castMatch = line.match(/\((\w+\s*\*)\)\s*\w+/);
                if (castMatch && !castMatch[1].includes('volatile')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Cast removes volatile qualification from pointer', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_11_8 = Rule_C_11_8;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMS04LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMS04LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsbUdBQW1HLENBQUM7SUFDbEgsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFVBQVUsQ0FBQztJQUN0QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxvQ0FBb0M7WUFDcEMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDakQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNyRCxJQUFJLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDakQsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELCtDQUErQyxFQUMvQyxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1lBRUQsdUNBQXVDO1lBQ3ZDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztnQkFDckQsSUFBSSxTQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7b0JBQ3BELFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxrREFBa0QsRUFDbEQsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFoREQsa0NBZ0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDExLjhcclxuICogQSBjYXN0IHNoYWxsIG5vdCByZW1vdmUgYW55IGNvbnN0IG9yIHZvbGF0aWxlIHF1YWxpZmljYXRpb24gZnJvbSB0aGUgdHlwZSBwb2ludGVkIHRvIGJ5IGEgcG9pbnRlci5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTFfOCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xMS44JztcclxuICBkZXNjcmlwdGlvbiA9ICdBIGNhc3Qgc2hhbGwgbm90IHJlbW92ZSBhbnkgY29uc3Qgb3Igdm9sYXRpbGUgcXVhbGlmaWNhdGlvbiBmcm9tIHRoZSB0eXBlIHBvaW50ZWQgdG8gYnkgYSBwb2ludGVyJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUG9pbnRlcnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBjYXN0IHRoYXQgcmVtb3ZlcyBjb25zdFxyXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygnY29uc3QnKSAmJiBsaW5lLmluY2x1ZGVzKCcoJykpIHtcclxuICAgICAgICBjb25zdCBjYXN0TWF0Y2ggPSBsaW5lLm1hdGNoKC9cXCgoXFx3K1xccypcXCopXFwpXFxzKlxcdysvKTtcclxuICAgICAgICBpZiAoY2FzdE1hdGNoICYmICFjYXN0TWF0Y2hbMV0uaW5jbHVkZXMoJ2NvbnN0JykpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnQ2FzdCByZW1vdmVzIGNvbnN0IHF1YWxpZmljYXRpb24gZnJvbSBwb2ludGVyJyxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3IgY2FzdCB0aGF0IHJlbW92ZXMgdm9sYXRpbGVcclxuICAgICAgaWYgKGxpbmUuaW5jbHVkZXMoJ3ZvbGF0aWxlJykgJiYgbGluZS5pbmNsdWRlcygnKCcpKSB7XHJcbiAgICAgICAgY29uc3QgY2FzdE1hdGNoID0gbGluZS5tYXRjaCgvXFwoKFxcdytcXHMqXFwqKVxcKVxccypcXHcrLyk7XHJcbiAgICAgICAgaWYgKGNhc3RNYXRjaCAmJiAhY2FzdE1hdGNoWzFdLmluY2x1ZGVzKCd2b2xhdGlsZScpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgJ0Nhc3QgcmVtb3ZlcyB2b2xhdGlsZSBxdWFsaWZpY2F0aW9uIGZyb20gcG9pbnRlcicsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=