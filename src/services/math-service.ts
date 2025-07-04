'use server';

/**
 * @fileOverview A service for evaluating mathematical expressions.
 *
 * - evaluateExpression - Evaluates a mathematical expression string.
 */

export async function evaluateExpression(expression: string): Promise<{ result: number }> {
    try {
        // Sanitize and evaluate the expression
        // Replace common unicode math symbols
        const sanitizedExpression = expression
            .replace(/×/g, '*')
            .replace(/÷/g, '/');
        
        // Basic validation to prevent arbitrary code execution
        if (/[^0-9+\-*/.()\s]/.test(sanitizedExpression)) {
            console.error("Invalid characters in expression:", sanitizedExpression);
            return { result: NaN };
        }
        
        // Use Function constructor for safer evaluation than eval() in this context
        const result = new Function('return ' + sanitizedExpression)();
        
        if (typeof result !== 'number' || !isFinite(result)) {
            console.error("Invalid result from expression:", result);
            return { result: NaN };
        }
        
        return { result };

    } catch (error) {
        console.error("Evaluation error:", error);
        return { result: NaN };
    }
}
