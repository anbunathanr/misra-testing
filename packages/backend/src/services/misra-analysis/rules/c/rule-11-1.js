"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_11_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 11.1
 * Conversions shall not be performed between a pointer to a function and
 * any other type.
 * Detects casts involving function pointer types.
 */
class Rule_C_11_1 {
    id = 'MISRA-C-11.1';
    description = 'Conversions shall not be performed between a pointer to a function and any other type';
    severity = 'mandatory';
    category = 'Pointer conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect function pointer casts: (type (*)(params)) or casting to/from void*
        // Pattern: (returnType (*)(params))
        const funcPtrCastRegex = /\(\s*\w[\w\s*]*\(\s*\*\s*\)\s*\([^)]*\)\s*\)/;
        // Pattern: casting a function pointer to void* or other pointer
        const voidPtrFuncRegex = /\(\s*void\s*\*\s*\)\s*\w+/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            if (funcPtrCastRegex.test(line) || voidPtrFuncRegex.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Conversion between function pointer and other type detected', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_11_1 = Rule_C_11_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMS0xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMS0xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyx1RkFBdUYsQ0FBQztJQUN0RyxRQUFRLEdBQUcsV0FBb0IsQ0FBQztJQUNoQyxRQUFRLEdBQUcscUJBQXFCLENBQUM7SUFDakMsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsNkVBQTZFO1FBQzdFLG9DQUFvQztRQUNwQyxNQUFNLGdCQUFnQixHQUFHLDhDQUE4QyxDQUFDO1FBQ3hFLGdFQUFnRTtRQUNoRSxNQUFNLGdCQUFnQixHQUFHLDJCQUEyQixDQUFDO1FBRXJELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRXJFLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMvRCxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsNkRBQTZELEVBQzdELElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXJDRCxrQ0FxQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTEuMVxyXG4gKiBDb252ZXJzaW9ucyBzaGFsbCBub3QgYmUgcGVyZm9ybWVkIGJldHdlZW4gYSBwb2ludGVyIHRvIGEgZnVuY3Rpb24gYW5kXHJcbiAqIGFueSBvdGhlciB0eXBlLlxyXG4gKiBEZXRlY3RzIGNhc3RzIGludm9sdmluZyBmdW5jdGlvbiBwb2ludGVyIHR5cGVzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xMV8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTExLjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0NvbnZlcnNpb25zIHNoYWxsIG5vdCBiZSBwZXJmb3JtZWQgYmV0d2VlbiBhIHBvaW50ZXIgdG8gYSBmdW5jdGlvbiBhbmQgYW55IG90aGVyIHR5cGUnO1xyXG4gIHNldmVyaXR5ID0gJ21hbmRhdG9yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUG9pbnRlciBjb252ZXJzaW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRGV0ZWN0IGZ1bmN0aW9uIHBvaW50ZXIgY2FzdHM6ICh0eXBlICgqKShwYXJhbXMpKSBvciBjYXN0aW5nIHRvL2Zyb20gdm9pZCpcclxuICAgIC8vIFBhdHRlcm46IChyZXR1cm5UeXBlICgqKShwYXJhbXMpKVxyXG4gICAgY29uc3QgZnVuY1B0ckNhc3RSZWdleCA9IC9cXChcXHMqXFx3W1xcd1xccypdKlxcKFxccypcXCpcXHMqXFwpXFxzKlxcKFteKV0qXFwpXFxzKlxcKS87XHJcbiAgICAvLyBQYXR0ZXJuOiBjYXN0aW5nIGEgZnVuY3Rpb24gcG9pbnRlciB0byB2b2lkKiBvciBvdGhlciBwb2ludGVyXHJcbiAgICBjb25zdCB2b2lkUHRyRnVuY1JlZ2V4ID0gL1xcKFxccyp2b2lkXFxzKlxcKlxccypcXClcXHMqXFx3Ky87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICBpZiAoZnVuY1B0ckNhc3RSZWdleC50ZXN0KGxpbmUpIHx8IHZvaWRQdHJGdW5jUmVnZXgudGVzdChsaW5lKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdDb252ZXJzaW9uIGJldHdlZW4gZnVuY3Rpb24gcG9pbnRlciBhbmQgb3RoZXIgdHlwZSBkZXRlY3RlZCcsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==