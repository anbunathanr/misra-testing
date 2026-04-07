"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_6_5_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 6-5-1
 * A for loop shall contain a single loop-counter which shall not have floating-point type.
 * Detects modification of loop counter within the loop body.
 */
class Rule_CPP_6_5_1 {
    id = 'MISRA-CPP-6.5.1';
    description = 'A for loop counter shall not be modified within the loop body';
    severity = 'required';
    category = 'Control flow';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Find for loops and track their counter variables
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.includes('for') || !line.includes('('))
                continue;
            // Extract loop counter from for statement
            const forMatch = line.match(/for\s*\(\s*(?:int|size_t|unsigned|long)?\s*(\w+)\s*=/);
            if (!forMatch)
                continue;
            const counter = forMatch[1];
            let braceDepth = 0;
            let inLoop = false;
            // Scan loop body for counter modifications
            for (let j = i; j < lines.length; j++) {
                const bodyLine = lines[j].trim();
                // Track brace depth
                braceDepth += (bodyLine.match(/{/g) || []).length;
                if (braceDepth > 0)
                    inLoop = true;
                braceDepth -= (bodyLine.match(/}/g) || []).length;
                // Exit when loop ends
                if (inLoop && braceDepth === 0)
                    break;
                // Skip the for statement line itself
                if (j === i)
                    continue;
                // Check for counter modification in loop body
                const modificationRegex = new RegExp(`\\b${counter}\\s*(?:=|\\+\\+|--|\\+=|-=|\\*=|/=)`, 'g');
                if (modificationRegex.test(bodyLine)) {
                    // Exclude the increment part of the for statement
                    if (j !== i) {
                        violations.push((0, rule_engine_1.createViolation)(this, j + 1, 0, `Loop counter '${counter}' is modified within the loop body`, bodyLine));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_6_5_1 = Rule_CPP_6_5_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTUtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNi01LTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRywrREFBK0QsQ0FBQztJQUM5RSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLG1EQUFtRDtRQUNuRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO2dCQUFFLFNBQVM7WUFFM0QsMENBQTBDO1lBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsc0RBQXNELENBQUMsQ0FBQztZQUNwRixJQUFJLENBQUMsUUFBUTtnQkFBRSxTQUFTO1lBRXhCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFDbkIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBRW5CLDJDQUEyQztZQUMzQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBRWpDLG9CQUFvQjtnQkFDcEIsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQ2xELElBQUksVUFBVSxHQUFHLENBQUM7b0JBQUUsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDbEMsVUFBVSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBRWxELHNCQUFzQjtnQkFDdEIsSUFBSSxNQUFNLElBQUksVUFBVSxLQUFLLENBQUM7b0JBQUUsTUFBTTtnQkFFdEMscUNBQXFDO2dCQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDO29CQUFFLFNBQVM7Z0JBRXRCLDhDQUE4QztnQkFDOUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLE9BQU8scUNBQXFDLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQzlGLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQ3JDLGtEQUFrRDtvQkFDbEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ1osVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGlCQUFpQixPQUFPLG9DQUFvQyxFQUM1RCxRQUFRLENBQ1QsQ0FDRixDQUFDO29CQUNKLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBNURELHdDQTREQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDYtNS0xXHJcbiAqIEEgZm9yIGxvb3Agc2hhbGwgY29udGFpbiBhIHNpbmdsZSBsb29wLWNvdW50ZXIgd2hpY2ggc2hhbGwgbm90IGhhdmUgZmxvYXRpbmctcG9pbnQgdHlwZS5cclxuICogRGV0ZWN0cyBtb2RpZmljYXRpb24gb2YgbG9vcCBjb3VudGVyIHdpdGhpbiB0aGUgbG9vcCBib2R5LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzZfNV8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtNi41LjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgZm9yIGxvb3AgY291bnRlciBzaGFsbCBub3QgYmUgbW9kaWZpZWQgd2l0aGluIHRoZSBsb29wIGJvZHknO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb250cm9sIGZsb3cnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRmluZCBmb3IgbG9vcHMgYW5kIHRyYWNrIHRoZWlyIGNvdW50ZXIgdmFyaWFibGVzXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmICghbGluZS5pbmNsdWRlcygnZm9yJykgfHwgIWxpbmUuaW5jbHVkZXMoJygnKSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBFeHRyYWN0IGxvb3AgY291bnRlciBmcm9tIGZvciBzdGF0ZW1lbnRcclxuICAgICAgY29uc3QgZm9yTWF0Y2ggPSBsaW5lLm1hdGNoKC9mb3JcXHMqXFwoXFxzKig/OmludHxzaXplX3R8dW5zaWduZWR8bG9uZyk/XFxzKihcXHcrKVxccyo9Lyk7XHJcbiAgICAgIGlmICghZm9yTWF0Y2gpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgY291bnRlciA9IGZvck1hdGNoWzFdO1xyXG4gICAgICBsZXQgYnJhY2VEZXB0aCA9IDA7XHJcbiAgICAgIGxldCBpbkxvb3AgPSBmYWxzZTtcclxuXHJcbiAgICAgIC8vIFNjYW4gbG9vcCBib2R5IGZvciBjb3VudGVyIG1vZGlmaWNhdGlvbnNcclxuICAgICAgZm9yIChsZXQgaiA9IGk7IGogPCBsaW5lcy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgIGNvbnN0IGJvZHlMaW5lID0gbGluZXNbal0udHJpbSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFRyYWNrIGJyYWNlIGRlcHRoXHJcbiAgICAgICAgYnJhY2VEZXB0aCArPSAoYm9keUxpbmUubWF0Y2goL3svZykgfHwgW10pLmxlbmd0aDtcclxuICAgICAgICBpZiAoYnJhY2VEZXB0aCA+IDApIGluTG9vcCA9IHRydWU7XHJcbiAgICAgICAgYnJhY2VEZXB0aCAtPSAoYm9keUxpbmUubWF0Y2goL30vZykgfHwgW10pLmxlbmd0aDtcclxuXHJcbiAgICAgICAgLy8gRXhpdCB3aGVuIGxvb3AgZW5kc1xyXG4gICAgICAgIGlmIChpbkxvb3AgJiYgYnJhY2VEZXB0aCA9PT0gMCkgYnJlYWs7XHJcblxyXG4gICAgICAgIC8vIFNraXAgdGhlIGZvciBzdGF0ZW1lbnQgbGluZSBpdHNlbGZcclxuICAgICAgICBpZiAoaiA9PT0gaSkgY29udGludWU7XHJcblxyXG4gICAgICAgIC8vIENoZWNrIGZvciBjb3VudGVyIG1vZGlmaWNhdGlvbiBpbiBsb29wIGJvZHlcclxuICAgICAgICBjb25zdCBtb2RpZmljYXRpb25SZWdleCA9IG5ldyBSZWdFeHAoYFxcXFxiJHtjb3VudGVyfVxcXFxzKig/Oj18XFxcXCtcXFxcK3wtLXxcXFxcKz18LT18XFxcXCo9fC89KWAsICdnJyk7XHJcbiAgICAgICAgaWYgKG1vZGlmaWNhdGlvblJlZ2V4LnRlc3QoYm9keUxpbmUpKSB7XHJcbiAgICAgICAgICAvLyBFeGNsdWRlIHRoZSBpbmNyZW1lbnQgcGFydCBvZiB0aGUgZm9yIHN0YXRlbWVudFxyXG4gICAgICAgICAgaWYgKGogIT09IGkpIHtcclxuICAgICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgICBqICsgMSxcclxuICAgICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgICBgTG9vcCBjb3VudGVyICcke2NvdW50ZXJ9JyBpcyBtb2RpZmllZCB3aXRoaW4gdGhlIGxvb3AgYm9keWAsXHJcbiAgICAgICAgICAgICAgICBib2R5TGluZVxyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19