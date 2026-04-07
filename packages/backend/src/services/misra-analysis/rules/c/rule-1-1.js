"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_1_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 1.1
 * All code shall conform to ISO 9899:2011 C standard.
 * Detects use of non-standard compiler extensions.
 */
class Rule_C_1_1 {
    id = 'MISRA-C-1.1';
    description = 'All code shall conform to ISO 9899:2011 C standard';
    severity = 'mandatory';
    category = 'Language';
    language = 'C';
    nonStandardExtensions = [
        '__attribute__',
        '__declspec',
        '__asm',
        '__volatile__',
        '__inline__',
        '__typeof__',
        '__builtin_',
        '__extension__',
    ];
    async check(ast, sourceCode) {
        const violations = [];
        for (const token of ast.tokens) {
            if (token.type === 'identifier') {
                for (const ext of this.nonStandardExtensions) {
                    if (token.value === ext || token.value.startsWith('__builtin_')) {
                        const line = ast.lines[token.line - 1] || '';
                        violations.push((0, rule_engine_1.createViolation)(this, token.line, token.column, `Non-standard extension '${token.value}' detected`, line.trim()));
                        break;
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_1_1 = Rule_C_1_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xLTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTEtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7R0FJRztBQUNILE1BQWEsVUFBVTtJQUNyQixFQUFFLEdBQUcsYUFBYSxDQUFDO0lBQ25CLFdBQVcsR0FBRyxvREFBb0QsQ0FBQztJQUNuRSxRQUFRLEdBQUcsV0FBb0IsQ0FBQztJQUNoQyxRQUFRLEdBQUcsVUFBVSxDQUFDO0lBQ3RCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFUCxxQkFBcUIsR0FBRztRQUN2QyxlQUFlO1FBQ2YsWUFBWTtRQUNaLE9BQU87UUFDUCxjQUFjO1FBQ2QsWUFBWTtRQUNaLFlBQVk7UUFDWixZQUFZO1FBQ1osZUFBZTtLQUNoQixDQUFDO0lBRUYsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUVuQyxLQUFLLE1BQU0sS0FBSyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7Z0JBQ2hDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7b0JBQzdDLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQzt3QkFDaEUsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDN0MsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLEtBQUssQ0FBQyxJQUFJLEVBQ1YsS0FBSyxDQUFDLE1BQU0sRUFDWiwyQkFBMkIsS0FBSyxDQUFDLEtBQUssWUFBWSxFQUNsRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQ1osQ0FDRixDQUFDO3dCQUNGLE1BQU07b0JBQ1IsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUEzQ0QsZ0NBMkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDEuMVxyXG4gKiBBbGwgY29kZSBzaGFsbCBjb25mb3JtIHRvIElTTyA5ODk5OjIwMTEgQyBzdGFuZGFyZC5cclxuICogRGV0ZWN0cyB1c2Ugb2Ygbm9uLXN0YW5kYXJkIGNvbXBpbGVyIGV4dGVuc2lvbnMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzFfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xLjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0FsbCBjb2RlIHNoYWxsIGNvbmZvcm0gdG8gSVNPIDk4OTk6MjAxMSBDIHN0YW5kYXJkJztcclxuICBzZXZlcml0eSA9ICdtYW5kYXRvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0xhbmd1YWdlJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgcHJpdmF0ZSByZWFkb25seSBub25TdGFuZGFyZEV4dGVuc2lvbnMgPSBbXHJcbiAgICAnX19hdHRyaWJ1dGVfXycsXHJcbiAgICAnX19kZWNsc3BlYycsXHJcbiAgICAnX19hc20nLFxyXG4gICAgJ19fdm9sYXRpbGVfXycsXHJcbiAgICAnX19pbmxpbmVfXycsXHJcbiAgICAnX190eXBlb2ZfXycsXHJcbiAgICAnX19idWlsdGluXycsXHJcbiAgICAnX19leHRlbnNpb25fXycsXHJcbiAgXTtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChjb25zdCB0b2tlbiBvZiBhc3QudG9rZW5zKSB7XHJcbiAgICAgIGlmICh0b2tlbi50eXBlID09PSAnaWRlbnRpZmllcicpIHtcclxuICAgICAgICBmb3IgKGNvbnN0IGV4dCBvZiB0aGlzLm5vblN0YW5kYXJkRXh0ZW5zaW9ucykge1xyXG4gICAgICAgICAgaWYgKHRva2VuLnZhbHVlID09PSBleHQgfHwgdG9rZW4udmFsdWUuc3RhcnRzV2l0aCgnX19idWlsdGluXycpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbdG9rZW4ubGluZSAtIDFdIHx8ICcnO1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICAgIHRva2VuLmxpbmUsXHJcbiAgICAgICAgICAgICAgICB0b2tlbi5jb2x1bW4sXHJcbiAgICAgICAgICAgICAgICBgTm9uLXN0YW5kYXJkIGV4dGVuc2lvbiAnJHt0b2tlbi52YWx1ZX0nIGRldGVjdGVkYCxcclxuICAgICAgICAgICAgICAgIGxpbmUudHJpbSgpXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19