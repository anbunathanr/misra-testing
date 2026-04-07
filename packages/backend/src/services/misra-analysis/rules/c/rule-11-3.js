"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_11_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 11.3
 * A cast shall not be performed between a pointer to object type and a
 * pointer to a different object type.
 * Detects C-style casts between pointer types.
 */
class Rule_C_11_3 {
    id = 'MISRA-C-11.3';
    description = 'A cast shall not be performed between a pointer to object type and a pointer to a different object type';
    severity = 'required';
    category = 'Pointer conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect C-style pointer casts: (type*) or (type *)
        const ptrCastRegex = /\(\s*(?:const\s+|volatile\s+)?[a-zA-Z_]\w*\s*\*+\s*\)/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            const matches = line.match(ptrCastRegex);
            if (matches) {
                for (const match of matches) {
                    // Skip void* casts (those are handled by rule 11.5)
                    if (match.includes('void'))
                        continue;
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `C-style pointer cast '${match.trim()}' detected`, line));
                    break; // Report once per line
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_11_3 = Rule_C_11_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMS0zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMS0zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyx5R0FBeUcsQ0FBQztJQUN4SCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcscUJBQXFCLENBQUM7SUFDakMsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsb0RBQW9EO1FBQ3BELE1BQU0sWUFBWSxHQUFHLHdEQUF3RCxDQUFDO1FBRTlFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRXJFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDekMsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDWixLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUM1QixvREFBb0Q7b0JBQ3BELElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7d0JBQUUsU0FBUztvQkFFckMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHlCQUF5QixLQUFLLENBQUMsSUFBSSxFQUFFLFlBQVksRUFDakQsSUFBSSxDQUNMLENBQ0YsQ0FBQztvQkFDRixNQUFNLENBQUMsdUJBQXVCO2dCQUNoQyxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUF6Q0Qsa0NBeUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDExLjNcclxuICogQSBjYXN0IHNoYWxsIG5vdCBiZSBwZXJmb3JtZWQgYmV0d2VlbiBhIHBvaW50ZXIgdG8gb2JqZWN0IHR5cGUgYW5kIGFcclxuICogcG9pbnRlciB0byBhIGRpZmZlcmVudCBvYmplY3QgdHlwZS5cclxuICogRGV0ZWN0cyBDLXN0eWxlIGNhc3RzIGJldHdlZW4gcG9pbnRlciB0eXBlcy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTFfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xMS4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdBIGNhc3Qgc2hhbGwgbm90IGJlIHBlcmZvcm1lZCBiZXR3ZWVuIGEgcG9pbnRlciB0byBvYmplY3QgdHlwZSBhbmQgYSBwb2ludGVyIHRvIGEgZGlmZmVyZW50IG9iamVjdCB0eXBlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUG9pbnRlciBjb252ZXJzaW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRGV0ZWN0IEMtc3R5bGUgcG9pbnRlciBjYXN0czogKHR5cGUqKSBvciAodHlwZSAqKVxyXG4gICAgY29uc3QgcHRyQ2FzdFJlZ2V4ID0gL1xcKFxccyooPzpjb25zdFxccyt8dm9sYXRpbGVcXHMrKT9bYS16QS1aX11cXHcqXFxzKlxcKitcXHMqXFwpL2c7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBtYXRjaGVzID0gbGluZS5tYXRjaChwdHJDYXN0UmVnZXgpO1xyXG4gICAgICBpZiAobWF0Y2hlcykge1xyXG4gICAgICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbWF0Y2hlcykge1xyXG4gICAgICAgICAgLy8gU2tpcCB2b2lkKiBjYXN0cyAodGhvc2UgYXJlIGhhbmRsZWQgYnkgcnVsZSAxMS41KVxyXG4gICAgICAgICAgaWYgKG1hdGNoLmluY2x1ZGVzKCd2b2lkJykpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICBgQy1zdHlsZSBwb2ludGVyIGNhc3QgJyR7bWF0Y2gudHJpbSgpfScgZGV0ZWN0ZWRgLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIGJyZWFrOyAvLyBSZXBvcnQgb25jZSBwZXIgbGluZVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=