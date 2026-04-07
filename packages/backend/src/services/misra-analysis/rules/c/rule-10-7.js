"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_10_7 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 10.7
 * If a composite expression is used as one operand of an operator in which the usual arithmetic conversions are performed then the other operand shall not have wider essential type.
 */
class Rule_C_10_7 {
    id = 'MISRA-C-10.7';
    description = 'If a composite expression is used as one operand of an operator in which the usual arithmetic conversions are performed then the other operand shall not have wider essential type';
    severity = 'required';
    category = 'Conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for composite expression with wider type operand
            if (line.includes('+') || line.includes('-') || line.includes('*') || line.includes('/')) {
                const compositeMatch = line.match(/\([^)]+[+\-*\/][^)]+\)\s*[+\-*\/]\s*\w+/);
                if (compositeMatch) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Composite expression used with potentially wider type operand', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_10_7 = Rule_C_10_7;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMC03LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMC03LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsb0xBQW9MLENBQUM7SUFDbk0sUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyx5REFBeUQ7WUFDekQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pGLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQztnQkFDN0UsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDbkIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELCtEQUErRCxFQUMvRCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWhDRCxrQ0FnQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTAuN1xyXG4gKiBJZiBhIGNvbXBvc2l0ZSBleHByZXNzaW9uIGlzIHVzZWQgYXMgb25lIG9wZXJhbmQgb2YgYW4gb3BlcmF0b3IgaW4gd2hpY2ggdGhlIHVzdWFsIGFyaXRobWV0aWMgY29udmVyc2lvbnMgYXJlIHBlcmZvcm1lZCB0aGVuIHRoZSBvdGhlciBvcGVyYW5kIHNoYWxsIG5vdCBoYXZlIHdpZGVyIGVzc2VudGlhbCB0eXBlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xMF83IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTEwLjcnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0lmIGEgY29tcG9zaXRlIGV4cHJlc3Npb24gaXMgdXNlZCBhcyBvbmUgb3BlcmFuZCBvZiBhbiBvcGVyYXRvciBpbiB3aGljaCB0aGUgdXN1YWwgYXJpdGhtZXRpYyBjb252ZXJzaW9ucyBhcmUgcGVyZm9ybWVkIHRoZW4gdGhlIG90aGVyIG9wZXJhbmQgc2hhbGwgbm90IGhhdmUgd2lkZXIgZXNzZW50aWFsIHR5cGUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb252ZXJzaW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIGNvbXBvc2l0ZSBleHByZXNzaW9uIHdpdGggd2lkZXIgdHlwZSBvcGVyYW5kXHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCcrJykgfHwgbGluZS5pbmNsdWRlcygnLScpIHx8IGxpbmUuaW5jbHVkZXMoJyonKSB8fCBsaW5lLmluY2x1ZGVzKCcvJykpIHtcclxuICAgICAgICBjb25zdCBjb21wb3NpdGVNYXRjaCA9IGxpbmUubWF0Y2goL1xcKFteKV0rWytcXC0qXFwvXVteKV0rXFwpXFxzKlsrXFwtKlxcL11cXHMqXFx3Ky8pO1xyXG4gICAgICAgIGlmIChjb21wb3NpdGVNYXRjaCkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdDb21wb3NpdGUgZXhwcmVzc2lvbiB1c2VkIHdpdGggcG90ZW50aWFsbHkgd2lkZXIgdHlwZSBvcGVyYW5kJyxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==