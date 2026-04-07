"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_17_7 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 17.7
 * The value returned by a function having non-void return type shall be used.
 * Detects function calls whose return values are discarded.
 */
class Rule_C_17_7 {
    id = 'MISRA-C-17.7';
    description = 'The value returned by a function having non-void return type shall be used';
    severity = 'required';
    category = 'Functions';
    language = 'C';
    // Common non-void functions whose return values are often ignored
    nonVoidFunctions = [
        'malloc', 'calloc', 'realloc', 'fopen', 'fclose', 'fread', 'fwrite',
        'fprintf', 'sprintf', 'snprintf', 'scanf', 'sscanf', 'fscanf',
        'strlen', 'strcpy', 'strncpy', 'strcat', 'strncat', 'strcmp',
        'memcpy', 'memmove', 'memset', 'memcmp',
        'atoi', 'atol', 'atof', 'strtol', 'strtod',
    ];
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            for (const funcName of this.nonVoidFunctions) {
                // Match: funcName(...); — standalone call without assignment
                const callRegex = new RegExp(`^\\s*${funcName}\\s*\\(`);
                if (callRegex.test(line) && line.endsWith(';')) {
                    // Make sure it's not assigned
                    if (!line.includes('=') && !line.startsWith('if') && !line.startsWith('while')) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Return value of '${funcName}' is discarded`, line));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_17_7 = Rule_C_17_7;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNy03LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNy03LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLDRFQUE0RSxDQUFDO0lBQzNGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxXQUFXLENBQUM7SUFDdkIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixrRUFBa0U7SUFDakQsZ0JBQWdCLEdBQUc7UUFDbEMsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUTtRQUNuRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVE7UUFDN0QsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRO1FBQzVELFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVE7UUFDdkMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVE7S0FDM0MsQ0FBQztJQUVGLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUM3Qyw2REFBNkQ7Z0JBQzdELE1BQU0sU0FBUyxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsUUFBUSxTQUFTLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDL0MsOEJBQThCO29CQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7d0JBQy9FLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxvQkFBb0IsUUFBUSxnQkFBZ0IsRUFDNUMsSUFBSSxDQUNMLENBQ0YsQ0FBQztvQkFDSixDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQS9DRCxrQ0ErQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTcuN1xyXG4gKiBUaGUgdmFsdWUgcmV0dXJuZWQgYnkgYSBmdW5jdGlvbiBoYXZpbmcgbm9uLXZvaWQgcmV0dXJuIHR5cGUgc2hhbGwgYmUgdXNlZC5cclxuICogRGV0ZWN0cyBmdW5jdGlvbiBjYWxscyB3aG9zZSByZXR1cm4gdmFsdWVzIGFyZSBkaXNjYXJkZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE3XzcgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTcuNyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHZhbHVlIHJldHVybmVkIGJ5IGEgZnVuY3Rpb24gaGF2aW5nIG5vbi12b2lkIHJldHVybiB0eXBlIHNoYWxsIGJlIHVzZWQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdGdW5jdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICAvLyBDb21tb24gbm9uLXZvaWQgZnVuY3Rpb25zIHdob3NlIHJldHVybiB2YWx1ZXMgYXJlIG9mdGVuIGlnbm9yZWRcclxuICBwcml2YXRlIHJlYWRvbmx5IG5vblZvaWRGdW5jdGlvbnMgPSBbXHJcbiAgICAnbWFsbG9jJywgJ2NhbGxvYycsICdyZWFsbG9jJywgJ2ZvcGVuJywgJ2ZjbG9zZScsICdmcmVhZCcsICdmd3JpdGUnLFxyXG4gICAgJ2ZwcmludGYnLCAnc3ByaW50ZicsICdzbnByaW50ZicsICdzY2FuZicsICdzc2NhbmYnLCAnZnNjYW5mJyxcclxuICAgICdzdHJsZW4nLCAnc3RyY3B5JywgJ3N0cm5jcHknLCAnc3RyY2F0JywgJ3N0cm5jYXQnLCAnc3RyY21wJyxcclxuICAgICdtZW1jcHknLCAnbWVtbW92ZScsICdtZW1zZXQnLCAnbWVtY21wJyxcclxuICAgICdhdG9pJywgJ2F0b2wnLCAnYXRvZicsICdzdHJ0b2wnLCAnc3RydG9kJyxcclxuICBdO1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuXHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgZm9yIChjb25zdCBmdW5jTmFtZSBvZiB0aGlzLm5vblZvaWRGdW5jdGlvbnMpIHtcclxuICAgICAgICAvLyBNYXRjaDogZnVuY05hbWUoLi4uKTsg4oCUIHN0YW5kYWxvbmUgY2FsbCB3aXRob3V0IGFzc2lnbm1lbnRcclxuICAgICAgICBjb25zdCBjYWxsUmVnZXggPSBuZXcgUmVnRXhwKGBeXFxcXHMqJHtmdW5jTmFtZX1cXFxccypcXFxcKGApO1xyXG4gICAgICAgIGlmIChjYWxsUmVnZXgudGVzdChsaW5lKSAmJiBsaW5lLmVuZHNXaXRoKCc7JykpIHtcclxuICAgICAgICAgIC8vIE1ha2Ugc3VyZSBpdCdzIG5vdCBhc3NpZ25lZFxyXG4gICAgICAgICAgaWYgKCFsaW5lLmluY2x1ZGVzKCc9JykgJiYgIWxpbmUuc3RhcnRzV2l0aCgnaWYnKSAmJiAhbGluZS5zdGFydHNXaXRoKCd3aGlsZScpKSB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgYFJldHVybiB2YWx1ZSBvZiAnJHtmdW5jTmFtZX0nIGlzIGRpc2NhcmRlZGAsXHJcbiAgICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=