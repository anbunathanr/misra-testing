"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_12 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.12
 * Within an enumerator list, the value of an implicitly-specified enumeration constant shall be unique.
 */
class Rule_C_8_12 {
    id = 'MISRA-C-8.12';
    description = 'Within an enumerator list, the value of an implicitly-specified enumeration constant shall be unique';
    severity = 'required';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        let inEnum = false;
        let enumValues = new Set();
        let currentValue = 0;
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            if (line.includes('enum')) {
                inEnum = true;
                enumValues.clear();
                currentValue = 0;
            }
            if (inEnum && line.includes('}')) {
                inEnum = false;
            }
            if (inEnum && line.includes(',')) {
                const enumMatch = line.match(/(\w+)\s*=\s*(\d+)/);
                if (enumMatch) {
                    currentValue = parseInt(enumMatch[2]);
                }
                if (enumValues.has(currentValue)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Duplicate enum value ${currentValue}`, line));
                }
                enumValues.add(currentValue);
                currentValue++;
            }
        }
        return violations;
    }
}
exports.Rule_C_8_12 = Rule_C_8_12;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTEyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS04LTEyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsc0dBQXNHLENBQUM7SUFDckgsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksVUFBVSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDbkMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBRXJCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ2QsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNuQixZQUFZLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLENBQUM7WUFFRCxJQUFJLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sR0FBRyxLQUFLLENBQUM7WUFDakIsQ0FBQztZQUVELElBQUksTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNkLFlBQVksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLENBQUM7Z0JBRUQsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7b0JBQ2pDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCx3QkFBd0IsWUFBWSxFQUFFLEVBQ3RDLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztnQkFDRCxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUM3QixZQUFZLEVBQUUsQ0FBQztZQUNqQixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWxERCxrQ0FrREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgOC4xMlxyXG4gKiBXaXRoaW4gYW4gZW51bWVyYXRvciBsaXN0LCB0aGUgdmFsdWUgb2YgYW4gaW1wbGljaXRseS1zcGVjaWZpZWQgZW51bWVyYXRpb24gY29uc3RhbnQgc2hhbGwgYmUgdW5pcXVlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ184XzEyIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTguMTInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1dpdGhpbiBhbiBlbnVtZXJhdG9yIGxpc3QsIHRoZSB2YWx1ZSBvZiBhbiBpbXBsaWNpdGx5LXNwZWNpZmllZCBlbnVtZXJhdGlvbiBjb25zdGFudCBzaGFsbCBiZSB1bmlxdWUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdEZWNsYXJhdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGxldCBpbkVudW0gPSBmYWxzZTtcclxuICAgIGxldCBlbnVtVmFsdWVzID0gbmV3IFNldDxudW1iZXI+KCk7XHJcbiAgICBsZXQgY3VycmVudFZhbHVlID0gMDtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCdlbnVtJykpIHtcclxuICAgICAgICBpbkVudW0gPSB0cnVlO1xyXG4gICAgICAgIGVudW1WYWx1ZXMuY2xlYXIoKTtcclxuICAgICAgICBjdXJyZW50VmFsdWUgPSAwO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiAoaW5FbnVtICYmIGxpbmUuaW5jbHVkZXMoJ30nKSkge1xyXG4gICAgICAgIGluRW51bSA9IGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiAoaW5FbnVtICYmIGxpbmUuaW5jbHVkZXMoJywnKSkge1xyXG4gICAgICAgIGNvbnN0IGVudW1NYXRjaCA9IGxpbmUubWF0Y2goLyhcXHcrKVxccyo9XFxzKihcXGQrKS8pO1xyXG4gICAgICAgIGlmIChlbnVtTWF0Y2gpIHtcclxuICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IHBhcnNlSW50KGVudW1NYXRjaFsyXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChlbnVtVmFsdWVzLmhhcyhjdXJyZW50VmFsdWUpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYER1cGxpY2F0ZSBlbnVtIHZhbHVlICR7Y3VycmVudFZhbHVlfWAsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbnVtVmFsdWVzLmFkZChjdXJyZW50VmFsdWUpO1xyXG4gICAgICAgIGN1cnJlbnRWYWx1ZSsrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==