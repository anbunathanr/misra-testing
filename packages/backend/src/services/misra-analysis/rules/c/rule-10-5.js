"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_10_5 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 10.5
 * The value of an expression should not be cast to an inappropriate essential type.
 */
class Rule_C_10_5 {
    id = 'MISRA-C-10.5';
    description = 'The value of an expression should not be cast to an inappropriate essential type';
    severity = 'advisory';
    category = 'Conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for pointer to integer casts
            const ptrToIntMatch = line.match(/\((?:int|long|short)\)\s*\w+/);
            if (ptrToIntMatch && line.includes('*')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Inappropriate cast from pointer to integer type', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_10_5 = Rule_C_10_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMC01LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMC01LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsa0ZBQWtGLENBQUM7SUFDakcsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxxQ0FBcUM7WUFDckMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQ2pFLElBQUksYUFBYSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGlEQUFpRCxFQUNqRCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE5QkQsa0NBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDEwLjVcclxuICogVGhlIHZhbHVlIG9mIGFuIGV4cHJlc3Npb24gc2hvdWxkIG5vdCBiZSBjYXN0IHRvIGFuIGluYXBwcm9wcmlhdGUgZXNzZW50aWFsIHR5cGUuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzEwXzUgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTAuNSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHZhbHVlIG9mIGFuIGV4cHJlc3Npb24gc2hvdWxkIG5vdCBiZSBjYXN0IHRvIGFuIGluYXBwcm9wcmlhdGUgZXNzZW50aWFsIHR5cGUnO1xyXG4gIHNldmVyaXR5ID0gJ2Fkdmlzb3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb252ZXJzaW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHBvaW50ZXIgdG8gaW50ZWdlciBjYXN0c1xyXG4gICAgICBjb25zdCBwdHJUb0ludE1hdGNoID0gbGluZS5tYXRjaCgvXFwoKD86aW50fGxvbmd8c2hvcnQpXFwpXFxzKlxcdysvKTtcclxuICAgICAgaWYgKHB0clRvSW50TWF0Y2ggJiYgbGluZS5pbmNsdWRlcygnKicpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0luYXBwcm9wcmlhdGUgY2FzdCBmcm9tIHBvaW50ZXIgdG8gaW50ZWdlciB0eXBlJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19