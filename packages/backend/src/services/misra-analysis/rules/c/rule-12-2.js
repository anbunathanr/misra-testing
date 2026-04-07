"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_12_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 12.2
 * The right hand operand of a shift operator shall lie in the range zero to one less than the width in bits of the essential type of the left hand operand.
 */
class Rule_C_12_2 {
    id = 'MISRA-C-12.2';
    description = 'The right hand operand of a shift operator shall lie in the range zero to one less than the width in bits of the essential type of the left hand operand';
    severity = 'required';
    category = 'Expressions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for shift operations
            const shiftMatch = line.match(/(\w+)\s*(<<|>>)\s*(\d+)/);
            if (shiftMatch) {
                const shiftAmount = parseInt(shiftMatch[3]);
                // Check for common problematic shift amounts
                // Assuming 32-bit integers (common case)
                if (shiftAmount >= 32) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Shift amount ${shiftAmount} exceeds typical integer width`, line));
                }
                // Check for negative shift (if using variable)
                if (shiftAmount < 0) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Shift amount must be non-negative', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_12_2 = Rule_C_12_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMi0yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMi0yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsMEpBQTBKLENBQUM7SUFDekssUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyw2QkFBNkI7WUFDN0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBQ3pELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUU1Qyw2Q0FBNkM7Z0JBQzdDLHlDQUF5QztnQkFDekMsSUFBSSxXQUFXLElBQUksRUFBRSxFQUFFLENBQUM7b0JBQ3RCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxnQkFBZ0IsV0FBVyxnQ0FBZ0MsRUFDM0QsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO2dCQUVELCtDQUErQztnQkFDL0MsSUFBSSxXQUFXLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3BCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxtQ0FBbUMsRUFDbkMsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFqREQsa0NBaURDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDEyLjJcclxuICogVGhlIHJpZ2h0IGhhbmQgb3BlcmFuZCBvZiBhIHNoaWZ0IG9wZXJhdG9yIHNoYWxsIGxpZSBpbiB0aGUgcmFuZ2UgemVybyB0byBvbmUgbGVzcyB0aGFuIHRoZSB3aWR0aCBpbiBiaXRzIG9mIHRoZSBlc3NlbnRpYWwgdHlwZSBvZiB0aGUgbGVmdCBoYW5kIG9wZXJhbmQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzEyXzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTIuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHJpZ2h0IGhhbmQgb3BlcmFuZCBvZiBhIHNoaWZ0IG9wZXJhdG9yIHNoYWxsIGxpZSBpbiB0aGUgcmFuZ2UgemVybyB0byBvbmUgbGVzcyB0aGFuIHRoZSB3aWR0aCBpbiBiaXRzIG9mIHRoZSBlc3NlbnRpYWwgdHlwZSBvZiB0aGUgbGVmdCBoYW5kIG9wZXJhbmQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdFeHByZXNzaW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHNoaWZ0IG9wZXJhdGlvbnNcclxuICAgICAgY29uc3Qgc2hpZnRNYXRjaCA9IGxpbmUubWF0Y2goLyhcXHcrKVxccyooPDx8Pj4pXFxzKihcXGQrKS8pO1xyXG4gICAgICBpZiAoc2hpZnRNYXRjaCkge1xyXG4gICAgICAgIGNvbnN0IHNoaWZ0QW1vdW50ID0gcGFyc2VJbnQoc2hpZnRNYXRjaFszXSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvbW1vbiBwcm9ibGVtYXRpYyBzaGlmdCBhbW91bnRzXHJcbiAgICAgICAgLy8gQXNzdW1pbmcgMzItYml0IGludGVnZXJzIChjb21tb24gY2FzZSlcclxuICAgICAgICBpZiAoc2hpZnRBbW91bnQgPj0gMzIpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICBgU2hpZnQgYW1vdW50ICR7c2hpZnRBbW91bnR9IGV4Y2VlZHMgdHlwaWNhbCBpbnRlZ2VyIHdpZHRoYCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGZvciBuZWdhdGl2ZSBzaGlmdCAoaWYgdXNpbmcgdmFyaWFibGUpXHJcbiAgICAgICAgaWYgKHNoaWZ0QW1vdW50IDwgMCkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdTaGlmdCBhbW91bnQgbXVzdCBiZSBub24tbmVnYXRpdmUnLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19