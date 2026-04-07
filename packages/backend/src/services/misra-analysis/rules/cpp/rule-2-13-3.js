"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_13_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 2-13-3
 * A "U" suffix shall be applied to all octal or hexadecimal integer literals of unsigned type.
 * Ensures unsigned literals are explicitly marked.
 */
class Rule_CPP_2_13_3 {
    id = 'MISRA-CPP-2.13.3';
    description = 'Unsigned integer literals shall have a "U" suffix';
    severity = 'required';
    category = 'Lexical conventions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Hex literals without U suffix: 0xFF, 0x1234 (but not 0xFFu, 0xFFU)
        const hexWithoutURegex = /\b0[xX][0-9a-fA-F]+(?![uUlL])\b/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('//') || line.trim().startsWith('#'))
                continue;
            // Check for unsigned type declarations with hex literals
            if (/\b(unsigned|uint\d+_t)\b/.test(line)) {
                const hexLiterals = line.match(hexWithoutURegex);
                if (hexLiterals) {
                    for (const literal of hexLiterals) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, line.indexOf(literal), `Unsigned literal '${literal}' should have 'U' suffix`, line.trim()));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_2_13_3 = Rule_CPP_2_13_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTEzLTMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTItMTMtMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7R0FJRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLG1EQUFtRCxDQUFDO0lBQ2xFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQztJQUNqQyxRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixxRUFBcUU7UUFDckUsTUFBTSxnQkFBZ0IsR0FBRyxrQ0FBa0MsQ0FBQztRQUU1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7Z0JBQUUsU0FBUztZQUUxRSx5REFBeUQ7WUFDekQsSUFBSSwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNoQixLQUFLLE1BQU0sT0FBTyxJQUFJLFdBQVcsRUFBRSxDQUFDO3dCQUNsQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUNyQixxQkFBcUIsT0FBTywwQkFBMEIsRUFDdEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUNaLENBQ0YsQ0FBQztvQkFDSixDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXZDRCwwQ0F1Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSAyLTEzLTNcclxuICogQSBcIlVcIiBzdWZmaXggc2hhbGwgYmUgYXBwbGllZCB0byBhbGwgb2N0YWwgb3IgaGV4YWRlY2ltYWwgaW50ZWdlciBsaXRlcmFscyBvZiB1bnNpZ25lZCB0eXBlLlxyXG4gKiBFbnN1cmVzIHVuc2lnbmVkIGxpdGVyYWxzIGFyZSBleHBsaWNpdGx5IG1hcmtlZC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8yXzEzXzMgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0yLjEzLjMnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1Vuc2lnbmVkIGludGVnZXIgbGl0ZXJhbHMgc2hhbGwgaGF2ZSBhIFwiVVwiIHN1ZmZpeCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0xleGljYWwgY29udmVudGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gSGV4IGxpdGVyYWxzIHdpdGhvdXQgVSBzdWZmaXg6IDB4RkYsIDB4MTIzNCAoYnV0IG5vdCAweEZGdSwgMHhGRlUpXHJcbiAgICBjb25zdCBoZXhXaXRob3V0VVJlZ2V4ID0gL1xcYjBbeFhdWzAtOWEtZkEtRl0rKD8hW3VVbExdKVxcYi9nO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG4gICAgICBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCcjJykpIGNvbnRpbnVlO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHVuc2lnbmVkIHR5cGUgZGVjbGFyYXRpb25zIHdpdGggaGV4IGxpdGVyYWxzXHJcbiAgICAgIGlmICgvXFxiKHVuc2lnbmVkfHVpbnRcXGQrX3QpXFxiLy50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgY29uc3QgaGV4TGl0ZXJhbHMgPSBsaW5lLm1hdGNoKGhleFdpdGhvdXRVUmVnZXgpO1xyXG4gICAgICAgIGlmIChoZXhMaXRlcmFscykge1xyXG4gICAgICAgICAgZm9yIChjb25zdCBsaXRlcmFsIG9mIGhleExpdGVyYWxzKSB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgICBsaW5lLmluZGV4T2YobGl0ZXJhbCksXHJcbiAgICAgICAgICAgICAgICBgVW5zaWduZWQgbGl0ZXJhbCAnJHtsaXRlcmFsfScgc2hvdWxkIGhhdmUgJ1UnIHN1ZmZpeGAsXHJcbiAgICAgICAgICAgICAgICBsaW5lLnRyaW0oKVxyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19