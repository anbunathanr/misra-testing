"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_22_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 22.1
 * All resources obtained dynamically by means of Standard Library functions
 * shall be explicitly released.
 * Detects fopen() calls without a corresponding fclose().
 */
class Rule_C_22_1 {
    id = 'MISRA-C-22.1';
    description = 'All resources obtained dynamically shall be explicitly released';
    severity = 'required';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track fopen calls and check for matching fclose
        const fopenRegex = /\bfopen\s*\(/;
        const fcloseRegex = /\bfclose\s*\(/;
        let fopenCount = 0;
        let fcloseCount = 0;
        const fopenLines = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (fopenRegex.test(line)) {
                fopenCount++;
                fopenLines.push(i + 1);
            }
            if (fcloseRegex.test(line)) {
                fcloseCount++;
            }
        }
        // Simple heuristic: if more fopen than fclose, report
        if (fopenCount > fcloseCount) {
            for (let i = fcloseCount; i < fopenLines.length; i++) {
                const lineIdx = fopenLines[i] - 1;
                violations.push((0, rule_engine_1.createViolation)(this, fopenLines[i], 0, 'Resource opened with fopen() may not be released before function exit', lines[lineIdx]?.trim() || ''));
            }
        }
        return violations;
    }
}
exports.Rule_C_22_1 = Rule_C_22_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yMi0xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0yMi0xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyxpRUFBaUUsQ0FBQztJQUNoRixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsV0FBVyxDQUFDO0lBQ3ZCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLGtEQUFrRDtRQUNsRCxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUM7UUFDbEMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDO1FBRXBDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDcEIsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFDO1FBRWhDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMxQixVQUFVLEVBQUUsQ0FBQztnQkFDYixVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN6QixDQUFDO1lBQ0QsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLFdBQVcsRUFBRSxDQUFDO1lBQ2hCLENBQUM7UUFDSCxDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELElBQUksVUFBVSxHQUFHLFdBQVcsRUFBRSxDQUFDO1lBQzdCLEtBQUssSUFBSSxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3JELE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2xDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQ2IsQ0FBQyxFQUNELHVFQUF1RSxFQUN2RSxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUM3QixDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWhERCxrQ0FnREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMjIuMVxyXG4gKiBBbGwgcmVzb3VyY2VzIG9idGFpbmVkIGR5bmFtaWNhbGx5IGJ5IG1lYW5zIG9mIFN0YW5kYXJkIExpYnJhcnkgZnVuY3Rpb25zXHJcbiAqIHNoYWxsIGJlIGV4cGxpY2l0bHkgcmVsZWFzZWQuXHJcbiAqIERldGVjdHMgZm9wZW4oKSBjYWxscyB3aXRob3V0IGEgY29ycmVzcG9uZGluZyBmY2xvc2UoKS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjJfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMi4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdBbGwgcmVzb3VyY2VzIG9idGFpbmVkIGR5bmFtaWNhbGx5IHNoYWxsIGJlIGV4cGxpY2l0bHkgcmVsZWFzZWQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdSZXNvdXJjZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIFRyYWNrIGZvcGVuIGNhbGxzIGFuZCBjaGVjayBmb3IgbWF0Y2hpbmcgZmNsb3NlXHJcbiAgICBjb25zdCBmb3BlblJlZ2V4ID0gL1xcYmZvcGVuXFxzKlxcKC87XHJcbiAgICBjb25zdCBmY2xvc2VSZWdleCA9IC9cXGJmY2xvc2VcXHMqXFwoLztcclxuXHJcbiAgICBsZXQgZm9wZW5Db3VudCA9IDA7XHJcbiAgICBsZXQgZmNsb3NlQ291bnQgPSAwO1xyXG4gICAgY29uc3QgZm9wZW5MaW5lczogbnVtYmVyW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuICAgICAgaWYgKGZvcGVuUmVnZXgudGVzdChsaW5lKSkge1xyXG4gICAgICAgIGZvcGVuQ291bnQrKztcclxuICAgICAgICBmb3BlbkxpbmVzLnB1c2goaSArIDEpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChmY2xvc2VSZWdleC50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgZmNsb3NlQ291bnQrKztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFNpbXBsZSBoZXVyaXN0aWM6IGlmIG1vcmUgZm9wZW4gdGhhbiBmY2xvc2UsIHJlcG9ydFxyXG4gICAgaWYgKGZvcGVuQ291bnQgPiBmY2xvc2VDb3VudCkge1xyXG4gICAgICBmb3IgKGxldCBpID0gZmNsb3NlQ291bnQ7IGkgPCBmb3BlbkxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgY29uc3QgbGluZUlkeCA9IGZvcGVuTGluZXNbaV0gLSAxO1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgZm9wZW5MaW5lc1tpXSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ1Jlc291cmNlIG9wZW5lZCB3aXRoIGZvcGVuKCkgbWF5IG5vdCBiZSByZWxlYXNlZCBiZWZvcmUgZnVuY3Rpb24gZXhpdCcsXHJcbiAgICAgICAgICAgIGxpbmVzW2xpbmVJZHhdPy50cmltKCkgfHwgJydcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==