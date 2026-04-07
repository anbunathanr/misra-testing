"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_2_1 = void 0;
/**
 * MISRA C++:2008 Rule 2-2-1
 * The character sequence /* shall not be used within a C-style comment
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_2_2_1 {
    id = 'MISRA-CPP-2.2.1';
    description = 'The character sequence /* shall not be used within a C-style comment';
    severity = 'required';
    category = 'Comments';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_2_2_1 = Rule_CPP_2_2_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTItMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMi0yLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyxzRUFBc0UsQ0FBQztJQUNyRixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsVUFBVSxDQUFDO0lBQ3RCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsOENBQThDO1FBQzlDLDJDQUEyQztRQUMzQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XG5cbi8qKlxuICogTUlTUkEgQysrOjIwMDggUnVsZSAyLTItMVxuICogVGhlIGNoYXJhY3RlciBzZXF1ZW5jZSAvKiBzaGFsbCBub3QgYmUgdXNlZCB3aXRoaW4gYSBDLXN0eWxlIGNvbW1lbnRcbiAqIFxuICogTk9URTogVGhpcyBpcyBhIHN0dWIgaW1wbGVtZW50YXRpb24uIEZ1bGwgaW1wbGVtZW50YXRpb24gcmVxdWlyZXM6XG4gKiAtIERldGFpbGVkIEFTVCBhbmFseXNpcyBmb3IgdGhpcyBzcGVjaWZpYyBydWxlXG4gKiAtIENvbXByZWhlbnNpdmUgdGVzdCBjYXNlc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHRoZSBydWxlIGVuZ2luZVxuICovXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMl8yXzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xuICBpZCA9ICdNSVNSQS1DUFAtMi4yLjEnO1xuICBkZXNjcmlwdGlvbiA9ICdUaGUgY2hhcmFjdGVyIHNlcXVlbmNlIC8qIHNoYWxsIG5vdCBiZSB1c2VkIHdpdGhpbiBhIEMtc3R5bGUgY29tbWVudCc7XG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcbiAgY2F0ZWdvcnkgPSAnQ29tbWVudHMnO1xuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xuXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHJldHVybnMgbm8gdmlvbGF0aW9uc1xuICAgIC8vIFRPRE86IEltcGxlbWVudCBmdWxsIHJ1bGUgY2hlY2tpbmcgbG9naWNcbiAgICByZXR1cm4gW107XG4gIH1cbn1cbiJdfQ==