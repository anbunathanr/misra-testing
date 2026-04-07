"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_9_6_4 = void 0;
/**
 * MISRA C++:2008 Rule 9-6-4
 * Named bit-fields with signed integer type shall have a length of more than one bit
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_9_6_4 {
    id = 'MISRA-CPP-9.6.4';
    description = 'Named bit-fields with signed integer type shall have a length of more than one bit';
    severity = 'required';
    category = 'Classes';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_9_6_4 = Rule_CPP_9_6_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS05LTYtNC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtOS02LTQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyxvRkFBb0YsQ0FBQztJQUNuRyxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQ3JCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsOENBQThDO1FBQzlDLDJDQUEyQztRQUMzQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XG5cbi8qKlxuICogTUlTUkEgQysrOjIwMDggUnVsZSA5LTYtNFxuICogTmFtZWQgYml0LWZpZWxkcyB3aXRoIHNpZ25lZCBpbnRlZ2VyIHR5cGUgc2hhbGwgaGF2ZSBhIGxlbmd0aCBvZiBtb3JlIHRoYW4gb25lIGJpdFxuICogXG4gKiBOT1RFOiBUaGlzIGlzIGEgc3R1YiBpbXBsZW1lbnRhdGlvbi4gRnVsbCBpbXBsZW1lbnRhdGlvbiByZXF1aXJlczpcbiAqIC0gRGV0YWlsZWQgQVNUIGFuYWx5c2lzIGZvciB0aGlzIHNwZWNpZmljIHJ1bGVcbiAqIC0gQ29tcHJlaGVuc2l2ZSB0ZXN0IGNhc2VzXG4gKiAtIEludGVncmF0aW9uIHdpdGggdGhlIHJ1bGUgZW5naW5lXG4gKi9cbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF85XzZfNCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XG4gIGlkID0gJ01JU1JBLUNQUC05LjYuNCc7XG4gIGRlc2NyaXB0aW9uID0gJ05hbWVkIGJpdC1maWVsZHMgd2l0aCBzaWduZWQgaW50ZWdlciB0eXBlIHNoYWxsIGhhdmUgYSBsZW5ndGggb2YgbW9yZSB0aGFuIG9uZSBiaXQnO1xuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XG4gIGNhdGVnb3J5ID0gJ0NsYXNzZXMnO1xuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xuXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHJldHVybnMgbm8gdmlvbGF0aW9uc1xuICAgIC8vIFRPRE86IEltcGxlbWVudCBmdWxsIHJ1bGUgY2hlY2tpbmcgbG9naWNcbiAgICByZXR1cm4gW107XG4gIH1cbn1cbiJdfQ==