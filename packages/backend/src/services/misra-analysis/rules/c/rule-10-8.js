"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_10_8 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 10.8
 * The value of a composite expression shall not be cast to a different essential type category or a wider essential type.
 */
class Rule_C_10_8 {
    id = 'MISRA-C-10.8';
    description = 'The value of a composite expression shall not be cast to a different essential type category or a wider essential type';
    severity = 'required';
    category = 'Conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for cast of composite expression
            const castMatch = line.match(/\((?:int|long|float|double|char)\)\s*\([^)]+[+\-*\/][^)]+\)/);
            if (castMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Composite expression cast to different or wider type', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_10_8 = Rule_C_10_8;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMC04LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMC04LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsd0hBQXdILENBQUM7SUFDdkksUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyx5Q0FBeUM7WUFDekMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO1lBQzVGLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2QsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHNEQUFzRCxFQUN0RCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE5QkQsa0NBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDEwLjhcclxuICogVGhlIHZhbHVlIG9mIGEgY29tcG9zaXRlIGV4cHJlc3Npb24gc2hhbGwgbm90IGJlIGNhc3QgdG8gYSBkaWZmZXJlbnQgZXNzZW50aWFsIHR5cGUgY2F0ZWdvcnkgb3IgYSB3aWRlciBlc3NlbnRpYWwgdHlwZS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTBfOCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xMC44JztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgdmFsdWUgb2YgYSBjb21wb3NpdGUgZXhwcmVzc2lvbiBzaGFsbCBub3QgYmUgY2FzdCB0byBhIGRpZmZlcmVudCBlc3NlbnRpYWwgdHlwZSBjYXRlZ29yeSBvciBhIHdpZGVyIGVzc2VudGlhbCB0eXBlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udmVyc2lvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBjYXN0IG9mIGNvbXBvc2l0ZSBleHByZXNzaW9uXHJcbiAgICAgIGNvbnN0IGNhc3RNYXRjaCA9IGxpbmUubWF0Y2goL1xcKCg/OmludHxsb25nfGZsb2F0fGRvdWJsZXxjaGFyKVxcKVxccypcXChbXildK1srXFwtKlxcL11bXildK1xcKS8pO1xyXG4gICAgICBpZiAoY2FzdE1hdGNoKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0NvbXBvc2l0ZSBleHByZXNzaW9uIGNhc3QgdG8gZGlmZmVyZW50IG9yIHdpZGVyIHR5cGUnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=