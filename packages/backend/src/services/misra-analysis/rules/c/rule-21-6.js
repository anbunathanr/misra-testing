"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_21_6 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 21.6
 * The Standard Library input/output functions shall not be used.
 * Detects use of printf, scanf, fprintf, fscanf, sprintf, sscanf, etc.
 */
class Rule_C_21_6 {
    id = 'MISRA-C-21.6';
    description = 'The Standard Library input/output functions shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    forbiddenFunctions = [
        'printf', 'scanf', 'fprintf', 'fscanf', 'sprintf', 'sscanf',
        'vprintf', 'vscanf', 'vfprintf', 'vfscanf', 'vsprintf', 'vsscanf',
        'snprintf', 'vsnprintf', 'gets', 'puts', 'fgets', 'fputs',
        'getchar', 'putchar', 'getc', 'putc', 'fgetc', 'fputc',
    ];
    async check(ast, sourceCode) {
        const violations = [];
        for (const token of ast.tokens) {
            if (token.type === 'identifier' && this.forbiddenFunctions.includes(token.value)) {
                const line = ast.lines[token.line - 1] || '';
                // Make sure it's a function call
                const lineAfter = line.slice(line.indexOf(token.value) + token.value.length).trim();
                if (lineAfter.startsWith('(')) {
                    violations.push((0, rule_engine_1.createViolation)(this, token.line, token.column, `Use of I/O function '${token.value}' is not permitted (MISRA C 21.6)`, line.trim()));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_21_6 = Rule_C_21_6;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yMS02LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0yMS02LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLCtEQUErRCxDQUFDO0lBQzlFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQztJQUNoQyxRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRVAsa0JBQWtCLEdBQUc7UUFDcEMsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRO1FBQzNELFNBQVMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUztRQUNqRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU87UUFDekQsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPO0tBQ3ZELENBQUM7SUFFRixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBRW5DLEtBQUssTUFBTSxLQUFLLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQy9CLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxZQUFZLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakYsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDN0MsaUNBQWlDO2dCQUNqQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BGLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM5QixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osS0FBSyxDQUFDLElBQUksRUFDVixLQUFLLENBQUMsTUFBTSxFQUNaLHdCQUF3QixLQUFLLENBQUMsS0FBSyxtQ0FBbUMsRUFDdEUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNaLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUF0Q0Qsa0NBc0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDIxLjZcclxuICogVGhlIFN0YW5kYXJkIExpYnJhcnkgaW5wdXQvb3V0cHV0IGZ1bmN0aW9ucyBzaGFsbCBub3QgYmUgdXNlZC5cclxuICogRGV0ZWN0cyB1c2Ugb2YgcHJpbnRmLCBzY2FuZiwgZnByaW50ZiwgZnNjYW5mLCBzcHJpbnRmLCBzc2NhbmYsIGV0Yy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfNiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMS42JztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgU3RhbmRhcmQgTGlicmFyeSBpbnB1dC9vdXRwdXQgZnVuY3Rpb25zIHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgcHJpdmF0ZSByZWFkb25seSBmb3JiaWRkZW5GdW5jdGlvbnMgPSBbXHJcbiAgICAncHJpbnRmJywgJ3NjYW5mJywgJ2ZwcmludGYnLCAnZnNjYW5mJywgJ3NwcmludGYnLCAnc3NjYW5mJyxcclxuICAgICd2cHJpbnRmJywgJ3ZzY2FuZicsICd2ZnByaW50ZicsICd2ZnNjYW5mJywgJ3ZzcHJpbnRmJywgJ3Zzc2NhbmYnLFxyXG4gICAgJ3NucHJpbnRmJywgJ3ZzbnByaW50ZicsICdnZXRzJywgJ3B1dHMnLCAnZmdldHMnLCAnZnB1dHMnLFxyXG4gICAgJ2dldGNoYXInLCAncHV0Y2hhcicsICdnZXRjJywgJ3B1dGMnLCAnZmdldGMnLCAnZnB1dGMnLFxyXG4gIF07XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAoY29uc3QgdG9rZW4gb2YgYXN0LnRva2Vucykge1xyXG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gJ2lkZW50aWZpZXInICYmIHRoaXMuZm9yYmlkZGVuRnVuY3Rpb25zLmluY2x1ZGVzKHRva2VuLnZhbHVlKSkge1xyXG4gICAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbdG9rZW4ubGluZSAtIDFdIHx8ICcnO1xyXG4gICAgICAgIC8vIE1ha2Ugc3VyZSBpdCdzIGEgZnVuY3Rpb24gY2FsbFxyXG4gICAgICAgIGNvbnN0IGxpbmVBZnRlciA9IGxpbmUuc2xpY2UobGluZS5pbmRleE9mKHRva2VuLnZhbHVlKSArIHRva2VuLnZhbHVlLmxlbmd0aCkudHJpbSgpO1xyXG4gICAgICAgIGlmIChsaW5lQWZ0ZXIuc3RhcnRzV2l0aCgnKCcpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIHRva2VuLmxpbmUsXHJcbiAgICAgICAgICAgICAgdG9rZW4uY29sdW1uLFxyXG4gICAgICAgICAgICAgIGBVc2Ugb2YgSS9PIGZ1bmN0aW9uICcke3Rva2VuLnZhbHVlfScgaXMgbm90IHBlcm1pdHRlZCAoTUlTUkEgQyAyMS42KWAsXHJcbiAgICAgICAgICAgICAgbGluZS50cmltKClcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19